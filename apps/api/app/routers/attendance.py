from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Any
from zoneinfo import ZoneInfo

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, field_validator

from app.db.pool import get_db
from app.middleware.subscription_guard import require_tenant_with_subscription

router = APIRouter()

EAT = ZoneInfo("Africa/Kampala")

TenantCtx = Annotated[
    tuple[uuid.UUID, dict[str, Any]],
    Depends(require_tenant_with_subscription),
]

ALLOWED_ROLES = {"teacher", "admin", "head_teacher"}


# ── Pydantic Models ────────────────────────────────────────────────────────────

class AttendanceEntry(BaseModel):
    student_id: uuid.UUID
    status: str
    notes: str | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in ("present", "absent", "late"):
            raise ValueError("status must be present, absent, or late")
        return v


class BulkAttendancePayload(BaseModel):
    timetable_period_id: uuid.UUID
    term_id: uuid.UUID
    date: str  # YYYY-MM-DD
    entries: list[AttendanceEntry]

    @field_validator("date")
    @classmethod
    def not_future(cls, v: str) -> str:
        today = datetime.now(tz=EAT).date().isoformat()
        if v > today:
            raise ValueError("Cannot record attendance for a future date")
        return v

    @field_validator("entries")
    @classmethod
    def entries_not_empty(cls, v: list) -> list:
        if not v:
            raise ValueError("entries must not be empty")
        if len(v) > 200:
            raise ValueError("Too many entries (max 200)")
        return v


# ── Internal Security Verification Helpers ─────────────────────────────────────

def _require_allowed_role(actor: dict[str, Any]) -> None:
    if actor["role"] not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "You do not have permission to access attendance.",
                "code": "FORBIDDEN",
            },
        )


async def _assert_teacher_owns_period(
    conn: asyncpg.Connection,
    teacher_id: uuid.UUID,
    timetable_period_id: uuid.UUID,
    school_id: uuid.UUID,
) -> uuid.UUID:
    """
    Validates that the teacher is assigned to this timetable period.
    Returns the associated class_id for downstream roster matching.
    """
    row = await conn.fetchrow(
        """
        SELECT class_id FROM timetable_periods
        WHERE id = $1 AND teacher_id = $2 AND school_id = $3
        LIMIT 1
        """,
        timetable_period_id,
        teacher_id,
        school_id,
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "You are not assigned to this timetable period.",
                "code": "FORBIDDEN",
            },
        )
    return row["class_id"]


def _class_display_name(level: str, stream: str | None) -> str:
    return f"{level} {stream}".strip() if stream else level


# ── GET /schools/attendance/timetable ──────────────────────────────────────────
# Fetches all periods assigned to a teacher for a given calendar date.

@router.get("/timetable")
async def get_teacher_timetable_slots(
    ctx: TenantCtx,
    conn: asyncpg.Connection = Depends(get_db),
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
):
    school_id, actor = ctx
    _require_allowed_role(actor)

    actor_id = uuid.UUID(str(actor["sub"]))

    parsed_date = datetime.strptime(date, "%Y-%m-%d").date()
    # ISO convention: Monday=1 ... Sunday=7
    day_of_week = parsed_date.isoweekday()

    periods = await conn.fetch(
        """
        SELECT
          tp.id            AS timetable_period_id,
          tp.class_id,
          sc.level,
          sc.stream,
          ss.name           AS subject_name,
          tp.period_number,
          tp.start_time::text AS start_time,
          tp.end_time::text   AS end_time
        FROM timetable_periods tp
        JOIN school_classes sc  ON sc.id = tp.class_id
        JOIN school_subjects ss ON ss.id = tp.subject_id
        WHERE tp.teacher_id = $1
          AND tp.day_of_week = $2
          AND tp.school_id = $3
        ORDER BY tp.start_time ASC
        """,
        actor_id,
        day_of_week,
        school_id,
    )

    result = []
    for p in periods:
        has_record = await conn.fetchval(
            """
            SELECT EXISTS(
                SELECT 1 FROM attendance
                WHERE timetable_period_id = $1 AND date = $2 AND school_id = $3
            )
            """,
            p["timetable_period_id"],
            parsed_date,
            school_id,
        )

        start_lbl = p["start_time"][:5]
        end_lbl = p["end_time"][:5]

        result.append({
            "timetableSlotId": str(p["timetable_period_id"]),
            "classId": str(p["class_id"]),
            "className": _class_display_name(p["level"], p["stream"]),
            "subjectName": p["subject_name"],
            "timeLabel": f"Period {p['period_number']} ({start_lbl} - {end_lbl})",
            "alreadySubmitted": has_record,
        })

    return {"data": result}


# ── GET /schools/attendance ────────────────────────────────────────────────────
# Daily roster fetch handler driven by the specified timetable period.

@router.get("")
async def get_daily_attendance(
    ctx: TenantCtx,
    conn: asyncpg.Connection = Depends(get_db),
    timetable_slot_id: uuid.UUID = Query(...),
    term_id: uuid.UUID = Query(...),
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
):
    school_id, actor = ctx
    _require_allowed_role(actor)

    actor_id = uuid.UUID(str(actor["sub"]))
    parsed_date = datetime.strptime(date, "%Y-%m-%d").date()

    if actor["role"] == "teacher":
        class_id = await _assert_teacher_owns_period(conn, actor_id, timetable_slot_id, school_id)
    else:
        class_id = await conn.fetchval(
            "SELECT class_id FROM timetable_periods WHERE id = $1 AND school_id = $2",
            timetable_slot_id, school_id
        )
        if not class_id:
            raise HTTPException(status_code=404, detail="Timetable period not found.")

    rows = await conn.fetch(
        """
        SELECT
          s.id              AS student_id,
          s.full_name       AS student_name,
          s.learner_id      AS learner_id,
          a.status,
          a.notes
        FROM students s
        LEFT JOIN attendance a
          ON a.student_id          = s.id
         AND a.timetable_period_id = $1
         AND a.date                = $2
         AND a.term_id             = $3
         AND a.school_id           = $4
        WHERE s.current_class_id = $5
          AND s.status = 'active'
          AND s.school_id = $4
        ORDER BY s.full_name ASC
        """,
        timetable_slot_id,
        parsed_date,
        term_id,
        school_id,
        class_id,
    )

    already_submitted = any(r["status"] is not None for r in rows)

    return {
        "data": {
            "date": date,
            "timetableSlotId": str(timetable_slot_id),
            "termId": str(term_id),
            "alreadySubmitted": already_submitted,
            "students": [
                {
                    "studentId":   str(r["student_id"]),
                    "studentName": r["student_name"],
                    "learnerId":   r["learner_id"] or "N/A",
                    "status":      r["status"],
                    "notes":       r["notes"],
                }
                for r in rows
            ],
        }
    }


# ── POST /schools/attendance/bulk ─────────────────────────────────────────────
# Upserts the complete list of logged student records for a given period+date.

@router.post("/bulk")
async def save_bulk_attendance(
    body: BulkAttendancePayload,
    ctx: TenantCtx,
    conn: asyncpg.Connection = Depends(get_db),
):
    school_id, actor = ctx

    if actor["role"] != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "Only teachers can record attendance.",
                "code": "FORBIDDEN",
            },
        )

    actor_id = uuid.UUID(str(actor["sub"]))
    parsed_date = datetime.strptime(body.date, "%Y-%m-%d").date()

    class_id = await _assert_teacher_owns_period(conn, actor_id, body.timetable_period_id, school_id)

    already_submitted = await conn.fetchval(
        """
        SELECT EXISTS(
            SELECT 1 FROM attendance
            WHERE timetable_period_id = $1 AND date = $2 AND school_id = $3
        )
        """,
        body.timetable_period_id,
        parsed_date,
        school_id,
    )
    if already_submitted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "Attendance for this period has already been submitted and is locked.",
                "code": "ALREADY_SUBMITTED",
            },
        )

    async with conn.transaction():
        for entry in body.entries:
            await conn.execute(
                """
                INSERT INTO attendance
                  (school_id, class_id, timetable_period_id, student_id, term_id,
                   date, status, notes, recorded_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                """,
                school_id,
                class_id,
                body.timetable_period_id,
                entry.student_id,
                body.term_id,
                parsed_date,
                entry.status,
                entry.notes,
                actor_id,
            )

    return {
        "data": {
            "saved": len(body.entries),
            "date":  body.date,
            "timetableSlotId": str(body.timetable_period_id),
        }
    }
# ── GET /schools/attendance/monthly ──────────────────────────────────────────
# Compiles the comprehensive matrix grid for structural history rendering.

@router.get("/monthly")
async def get_monthly_overview(
    ctx: TenantCtx,
    conn: asyncpg.Connection = Depends(get_db),
    class_id: uuid.UUID = Query(...),
    term_id: uuid.UUID = Query(...),
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
):
    school_id, actor = ctx
    _require_allowed_role(actor)

    period_ids = [
        r["id"] for r in await conn.fetch(
            "SELECT id FROM timetable_periods WHERE class_id = $1 AND school_id = $2",
            class_id, school_id
        )
    ]

    if not period_ids:
        return {
            "data": {
                "classId": str(class_id),
                "termId": str(term_id),
                "month": month,
                "schoolDays": [],
                "rows": [],
            }
        }

    rows = await conn.fetch(
        """
        SELECT
          s.id                 AS student_id,
          s.full_name          AS student_name,
          s.learner_id         AS learner_id,
          a.date::text         AS date,
          ss.name               AS subject_name,
          a.status
        FROM students s
        LEFT JOIN attendance a
          ON a.student_id = s.id
         AND a.term_id    = $2
         AND to_char(a.date, 'YYYY-MM') = $3
         AND a.school_id  = $4
         AND a.timetable_period_id = ANY($5)
        LEFT JOIN timetable_periods tp ON tp.id = a.timetable_period_id
        LEFT JOIN school_subjects ss ON ss.id = tp.subject_id
        WHERE s.current_class_id = $1
          AND s.status = 'active'
          AND s.school_id = $4
        ORDER BY s.full_name ASC, a.date ASC
        """,
        class_id,
        term_id,
        month,
        school_id,
        period_ids,
    )

    student_map: dict[str, dict] = {}
    session_columns: set[str] = set()

    for r in rows:
        sid = str(r["student_id"])
        if sid not in student_map:
            student_map[sid] = {
                "studentId":   sid,
                "studentName": r["student_name"],
                "learnerId":   r["learner_id"] or "N/A",
                "days":        {},
            }

        if r["date"] and r["status"] and r["subject_name"]:
            column_key = f"{r['date']} ({r['subject_name']})"
            student_map[sid]["days"][column_key] = r["status"]
            session_columns.add(column_key)

    result_rows = []
    for student in student_map.values():
        attended = sum(1 for s in student["days"].values() if s in ("present", "late"))
        result_rows.append({
            **student,
            "daysAttended": attended,
            "totalDays":    len(session_columns),
        })

    return {
        "data": {
            "classId":    str(class_id),
            "termId":     str(term_id),
            "month":      month,
            "schoolDays": sorted(list(session_columns)),
            "rows":       result_rows,
        }
    }