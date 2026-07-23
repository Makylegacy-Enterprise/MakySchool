from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Any, Optional
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
ADMIN_ROLES = {"admin", "head_teacher"}


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
        if len(v) > 1000:
            raise ValueError("Too many entries (max 1000)")
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


def _require_admin_role(actor: dict[str, Any]) -> None:
    if actor["role"] not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "Only admins and head teachers can view attendance analytics.",
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
          tp.end_time::text   AS end_time,
          (
            SELECT COUNT(*)::int
            FROM students s
            WHERE s.current_class_id = tp.class_id
              AND s.status = 'active'
              AND s.school_id = tp.school_id
          ) AS student_count,
          EXISTS(
            SELECT 1 FROM attendance a
            WHERE a.timetable_period_id = tp.id
              AND a.date = $4
              AND a.school_id = tp.school_id
          ) AS already_submitted
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
        parsed_date,
    )

    result = []
    for p in periods:
        start_lbl = p["start_time"][:5]
        end_lbl = p["end_time"][:5]

        result.append({
            "timetableSlotId": str(p["timetable_period_id"]),
            "classId": str(p["class_id"]),
            "className": _class_display_name(p["level"], p["stream"]),
            "subjectName": p["subject_name"],
            "periodNumber": p["period_number"],
            "startTime": start_lbl,
            "endTime": end_lbl,
            "timeLabel": f"Period {p['period_number']} ({start_lbl} - {end_lbl})",
            "studentCount": p["student_count"],
            "alreadySubmitted": p["already_submitted"],
        })

    return {"data": result}


# ── GET /schools/attendance/summary ───────────────────────────────────────────

@router.get("/summary")
async def get_attendance_summary(
    ctx: TenantCtx,
    conn: asyncpg.Connection = Depends(get_db),
    student_id: uuid.UUID = Query(...),
    term_id: uuid.UUID = Query(...),
):
    school_id, actor = ctx
    _require_allowed_role(actor)

    row = await conn.fetchrow(
        """
        WITH student_class AS (
          SELECT s.id AS student_id, s.current_class_id AS class_id
          FROM students s
          WHERE s.id = $1
            AND s.school_id = $2
            AND s.status = 'active'
        ),
        school_days AS (
          SELECT COUNT(DISTINCT a.date)::int AS total_school_days
          FROM attendance a
          JOIN student_class sc ON sc.class_id = a.class_id
          WHERE a.term_id = $3
            AND a.school_id = $2
        ),
        attended_days AS (
          SELECT COUNT(DISTINCT a.date)::int AS days_attended
          FROM attendance a
          JOIN student_class sc ON sc.student_id = a.student_id
          WHERE a.term_id = $3
            AND a.school_id = $2
            AND a.status IN ('present', 'late')
        )
        SELECT
          $1::uuid AS student_id,
          $3::uuid AS term_id,
          COALESCE((SELECT days_attended FROM attended_days), 0) AS days_attended,
          COALESCE((SELECT total_school_days FROM school_days), 0) AS total_school_days,
          EXISTS(SELECT 1 FROM student_class) AS student_found
        """,
        student_id,
        school_id,
        term_id,
    )

    if not row or not row["student_found"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "Student not found in this school.",
                "code": "NOT_FOUND",
            },
        )

    return {
        "data": {
            "studentId": str(row["student_id"]),
            "termId": str(row["term_id"]),
            "daysAttended": row["days_attended"],
            "totalSchoolDays": row["total_school_days"],
        }
    }


# ── GET /schools/attendance/admin/overview ────────────────────────────────────

@router.get("/admin/overview")
async def get_admin_overview(
    ctx: TenantCtx,
    conn: asyncpg.Connection = Depends(get_db),
    term_id: uuid.UUID = Query(...),
    date_from: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    date_to: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    class_id: Optional[uuid.UUID] = Query(None),
):
    school_id, actor = ctx
    _require_admin_role(actor)

    parsed_from = datetime.strptime(date_from, "%Y-%m-%d").date()
    parsed_to = datetime.strptime(date_to, "%Y-%m-%d").date()
    if parsed_from > parsed_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "date_from must be on or before date_to.",
                "code": "VALIDATION_ERROR",
            },
        )

    # Expected registers = distinct class-period slots on weekdays in range
    # that fall on the period's day_of_week, vs submitted (period+date with rows).
    overview = await conn.fetchrow(
        """
        WITH bounds AS (
          SELECT $2::date AS d_from, $3::date AS d_to
        ),
        active_classes AS (
          SELECT sc.id, sc.level, sc.stream
          FROM school_classes sc
          WHERE sc.school_id = $1
            AND ($4::uuid IS NULL OR sc.id = $4)
        ),
        active_students AS (
          SELECT s.id, s.current_class_id
          FROM students s
          WHERE s.school_id = $1
            AND s.status = 'active'
            AND ($4::uuid IS NULL OR s.current_class_id = $4)
        ),
        period_slots AS (
          SELECT tp.id AS period_id, tp.class_id, tp.day_of_week
          FROM timetable_periods tp
          JOIN active_classes ac ON ac.id = tp.class_id
          WHERE tp.school_id = $1
        ),
        calendar_days AS (
          SELECT generate_series(
            (SELECT d_from FROM bounds),
            (SELECT d_to FROM bounds),
            '1 day'::interval
          )::date AS day
        ),
        expected_registers AS (
          SELECT ps.period_id, ps.class_id, cd.day
          FROM period_slots ps
          JOIN calendar_days cd ON EXTRACT(ISODOW FROM cd.day)::int = ps.day_of_week
        ),
        submitted_registers AS (
          SELECT DISTINCT a.timetable_period_id AS period_id, a.class_id, a.date AS day
          FROM attendance a
          WHERE a.school_id = $1
            AND a.term_id = $5
            AND a.date BETWEEN $2 AND $3
            AND a.timetable_period_id IS NOT NULL
            AND ($4::uuid IS NULL OR a.class_id = $4)
        ),
        mark_totals AS (
          SELECT
            COUNT(*) FILTER (WHERE a.status = 'present')::int AS present_count,
            COUNT(*) FILTER (WHERE a.status = 'absent')::int AS absent_count,
            COUNT(*) FILTER (WHERE a.status = 'late')::int AS late_count,
            COUNT(DISTINCT a.date)::int AS school_days
          FROM attendance a
          WHERE a.school_id = $1
            AND a.term_id = $5
            AND a.date BETWEEN $2 AND $3
            AND ($4::uuid IS NULL OR a.class_id = $4)
        )
        SELECT
          (SELECT COUNT(*)::int FROM active_students) AS active_students,
          (SELECT COUNT(*)::int FROM active_classes) AS class_count,
          COALESCE((SELECT school_days FROM mark_totals), 0) AS school_days,
          COALESCE((SELECT present_count FROM mark_totals), 0) AS present_count,
          COALESCE((SELECT absent_count FROM mark_totals), 0) AS absent_count,
          COALESCE((SELECT late_count FROM mark_totals), 0) AS late_count,
          (SELECT COUNT(*)::int FROM submitted_registers) AS registers_submitted,
          (
            SELECT COUNT(*)::int FROM expected_registers er
            WHERE NOT EXISTS (
              SELECT 1 FROM submitted_registers sr
              WHERE sr.period_id = er.period_id AND sr.day = er.day
            )
          ) AS registers_missing
        """,
        school_id,
        parsed_from,
        parsed_to,
        class_id,
        term_id,
    )

    present = overview["present_count"] if overview else 0
    absent = overview["absent_count"] if overview else 0
    late = overview["late_count"] if overview else 0
    marked = present + absent + late
    avg_rate = round(((present + late) / marked) * 100, 1) if marked > 0 else 0.0
    registers_submitted = overview["registers_submitted"] if overview else 0
    registers_missing = overview["registers_missing"] if overview else 0
    registers_expected = registers_submitted + registers_missing

    daily_rows = await conn.fetch(
        """
        SELECT
          a.date::text AS date,
          COUNT(*) FILTER (WHERE a.status = 'present')::int AS present,
          COUNT(*) FILTER (WHERE a.status = 'absent')::int AS absent,
          COUNT(*) FILTER (WHERE a.status = 'late')::int AS late
        FROM attendance a
        WHERE a.school_id = $1
          AND a.term_id = $2
          AND a.date BETWEEN $3 AND $4
          AND ($5::uuid IS NULL OR a.class_id = $5)
        GROUP BY a.date
        ORDER BY a.date ASC
        """,
        school_id,
        term_id,
        parsed_from,
        parsed_to,
        class_id,
    )

    daily_trend = []
    for r in daily_rows:
        day_total = r["present"] + r["absent"] + r["late"]
        rate = round(((r["present"] + r["late"]) / day_total) * 100, 1) if day_total > 0 else 0.0
        daily_trend.append({
            "date": r["date"],
            "present": r["present"],
            "absent": r["absent"],
            "late": r["late"],
            "attendanceRate": rate,
        })

    class_rows = await conn.fetch(
        """
        WITH active_classes AS (
          SELECT sc.id, sc.level, sc.stream
          FROM school_classes sc
          WHERE sc.school_id = $1
            AND ($5::uuid IS NULL OR sc.id = $5)
        ),
        period_slots AS (
          SELECT tp.id AS period_id, tp.class_id, tp.day_of_week
          FROM timetable_periods tp
          JOIN active_classes ac ON ac.id = tp.class_id
          WHERE tp.school_id = $1
        ),
        calendar_days AS (
          SELECT generate_series($3::date, $4::date, '1 day'::interval)::date AS day
        ),
        expected_registers AS (
          SELECT ps.period_id, ps.class_id, cd.day
          FROM period_slots ps
          JOIN calendar_days cd ON EXTRACT(ISODOW FROM cd.day)::int = ps.day_of_week
        ),
        submitted_registers AS (
          SELECT DISTINCT a.timetable_period_id AS period_id, a.class_id, a.date AS day
          FROM attendance a
          WHERE a.school_id = $1
            AND a.term_id = $2
            AND a.date BETWEEN $3 AND $4
            AND a.timetable_period_id IS NOT NULL
            AND ($5::uuid IS NULL OR a.class_id = $5)
        ),
        marks AS (
          SELECT
            a.class_id,
            COUNT(*) FILTER (WHERE a.status = 'present')::int AS present,
            COUNT(*) FILTER (WHERE a.status = 'absent')::int AS absent,
            COUNT(*) FILTER (WHERE a.status = 'late')::int AS late,
            COUNT(DISTINCT a.date)::int AS school_days
          FROM attendance a
          WHERE a.school_id = $1
            AND a.term_id = $2
            AND a.date BETWEEN $3 AND $4
            AND ($5::uuid IS NULL OR a.class_id = $5)
          GROUP BY a.class_id
        ),
        class_students AS (
          SELECT s.current_class_id AS class_id, COUNT(*)::int AS student_count
          FROM students s
          WHERE s.school_id = $1
            AND s.status = 'active'
            AND ($5::uuid IS NULL OR s.current_class_id = $5)
          GROUP BY s.current_class_id
        )
        SELECT
          ac.id AS class_id,
          ac.level,
          ac.stream,
          COALESCE(cs.student_count, 0) AS student_count,
          COALESCE(m.present, 0) AS present,
          COALESCE(m.absent, 0) AS absent,
          COALESCE(m.late, 0) AS late,
          COALESCE(m.school_days, 0) AS school_days,
          (
            SELECT COUNT(*)::int FROM submitted_registers sr WHERE sr.class_id = ac.id
          ) AS registers_submitted,
          (
            SELECT COUNT(*)::int FROM expected_registers er
            WHERE er.class_id = ac.id
              AND NOT EXISTS (
                SELECT 1 FROM submitted_registers sr
                WHERE sr.period_id = er.period_id AND sr.day = er.day
              )
          ) AS registers_missing
        FROM active_classes ac
        LEFT JOIN marks m ON m.class_id = ac.id
        LEFT JOIN class_students cs ON cs.class_id = ac.id
        ORDER BY ac.level, ac.stream NULLS LAST
        """,
        school_id,
        term_id,
        parsed_from,
        parsed_to,
        class_id,
    )

    per_class = []
    for r in class_rows:
        c_marked = r["present"] + r["absent"] + r["late"]
        c_rate = round(((r["present"] + r["late"]) / c_marked) * 100, 1) if c_marked > 0 else 0.0
        per_class.append({
            "classId": str(r["class_id"]),
            "className": _class_display_name(r["level"], r["stream"]),
            "studentCount": r["student_count"],
            "schoolDays": r["school_days"],
            "present": r["present"],
            "absent": r["absent"],
            "late": r["late"],
            "attendanceRate": c_rate,
            "registersSubmitted": r["registers_submitted"],
            "registersMissing": r["registers_missing"],
        })

    return {
        "data": {
            "kpis": {
                "activeStudents": overview["active_students"] if overview else 0,
                "classCount": overview["class_count"] if overview else 0,
                "schoolDays": overview["school_days"] if overview else 0,
                "present": present,
                "absent": absent,
                "late": late,
                "registersSubmitted": registers_submitted,
                "registersMissing": registers_missing,
                "averageAttendanceRate": avg_rate,
            },
            "dailyTrend": daily_trend,
            "statusBreakdown": {
                "present": present,
                "absent": absent,
                "late": late,
            },
            "registerCompliance": {
                "submitted": registers_submitted,
                "missing": registers_missing,
                "expected": registers_expected,
                "complianceRate": (
                    round((registers_submitted / registers_expected) * 100, 1)
                    if registers_expected > 0
                    else 0.0
                ),
            },
            "perClass": per_class,
        }
    }


# ── GET /schools/attendance ────────────────────────────────────────────────────

@router.get("")
async def get_daily_attendance(
    ctx: TenantCtx,
    conn: asyncpg.Connection = Depends(get_db),
    timetable_slot_id: Optional[uuid.UUID] = Query(None),
    class_id: Optional[uuid.UUID] = Query(None),
    term_id: uuid.UUID = Query(...),
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
):
    school_id, actor = ctx
    _require_allowed_role(actor)

    actor_id = uuid.UUID(str(actor["sub"]))
    parsed_date = datetime.strptime(date, "%Y-%m-%d").date()

    if actor["role"] == "teacher":
        if not timetable_slot_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "Teachers must provide timetable_slot_id to view records.",
                    "code": "VALIDATION_ERROR",
                },
            )
        target_class_id = await _assert_teacher_owns_period(conn, actor_id, timetable_slot_id, school_id)
    else:
        if not class_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "Admins must provide class_id to view a class-wide roster.",
                    "code": "VALIDATION_ERROR",
                },
            )
        target_class_id = class_id

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
          ON a.student_id  = s.id
         AND a.date        = $1
         AND a.term_id     = $2
         AND a.school_id   = $3
         AND ($4::uuid IS NULL OR a.timetable_period_id = $4)
        WHERE s.current_class_id = $5
          AND s.status = 'active'
          AND s.school_id = $3
        ORDER BY s.full_name ASC
        """,
        parsed_date,
        term_id,
        school_id,
        timetable_slot_id,
        target_class_id,
    )

    already_submitted = any(r["status"] is not None for r in rows)

    return {
        "data": {
            "date": date,
            "classId": str(target_class_id),
            "timetableSlotId": str(timetable_slot_id) if timetable_slot_id else None,
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

    student_ids = [e.student_id for e in body.entries]
    statuses = [e.status for e in body.entries]
    notes_list = [e.notes for e in body.entries]

    async with conn.transaction():
        await conn.execute(
            """
            INSERT INTO attendance
              (school_id, class_id, timetable_period_id, student_id, term_id,
               date, status, notes, recorded_by)
            SELECT
              $1,
              $2,
              $3,
              u.student_id,
              $4,
              $5,
              u.status,
              u.notes,
              $6
            FROM unnest($7::uuid[], $8::text[], $9::text[])
              AS u(student_id, status, notes)
            """,
            school_id,
            class_id,
            body.timetable_period_id,
            body.term_id,
            parsed_date,
            actor_id,
            student_ids,
            statuses,
            notes_list,
        )

    return {
        "data": {
            "saved": len(body.entries),
            "date":  body.date,
            "timetableSlotId": str(body.timetable_period_id),
        }
    }


# ── GET /schools/attendance/monthly ──────────────────────────────────────────

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
