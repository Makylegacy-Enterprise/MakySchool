from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Any, Optional
from zoneinfo import ZoneInfo

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, field_validator

from app.db.pool import get_db
from app.lib.teacher_assignments import format_class_name, get_current_term_id
from app.middleware.subscription_guard import require_tenant_with_subscription

router = APIRouter()

EAT = ZoneInfo("Africa/Kampala")

TenantCtx = Annotated[
    tuple[uuid.UUID, dict[str, Any]],
    Depends(require_tenant_with_subscription),
]

ALLOWED_ROLES = {"teacher", "admin", "head_teacher"}
ADMIN_ROLES = {"admin", "head_teacher"}
HEAD_ROLES = {"head_teacher", "admin"}
MAJOR_FLAG_THRESHOLD = 3
INCIDENT_TYPES = frozenset({"minor", "major", "commendation"})


class CreateIncidentBody(BaseModel):
    student_id: uuid.UUID
    term_id: uuid.UUID
    incident_date: str
    incident_type: str
    description: str
    action_taken: str | None = None
    category: str | None = None
    class_id: uuid.UUID | None = None

    @field_validator("incident_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in INCIDENT_TYPES:
            raise ValueError("incident_type must be minor, major, or commendation")
        return v

    @field_validator("incident_date")
    @classmethod
    def not_future(cls, v: str) -> str:
        today = datetime.now(tz=EAT).date().isoformat()
        if v > today:
            raise ValueError("Cannot log an incident for a future date")
        return v

    @field_validator("description")
    @classmethod
    def description_required(cls, v: str) -> str:
        text = (v or "").strip()
        if len(text) < 5:
            raise ValueError("description must be at least 5 characters")
        if len(text) > 2000:
            raise ValueError("description must be under 2000 characters")
        return text


class RemarksBody(BaseModel):
    remarks: str

    @field_validator("remarks")
    @classmethod
    def remarks_ok(cls, v: str) -> str:
        text = (v or "").strip()
        if len(text) < 2:
            raise ValueError("remarks must be at least 2 characters")
        if len(text) > 2000:
            raise ValueError("remarks must be under 2000 characters")
        return text


class VoidBody(BaseModel):
    reason: str

    @field_validator("reason")
    @classmethod
    def reason_ok(cls, v: str) -> str:
        text = (v or "").strip()
        if len(text) < 3:
            raise ValueError("reason must be at least 3 characters")
        return text


def _require_allowed(actor: dict[str, Any]) -> None:
    if actor["role"] not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "You do not have permission to access discipline.", "code": "FORBIDDEN"},
        )


def _actor_id(actor: dict[str, Any]) -> uuid.UUID:
    return uuid.UUID(str(actor.get("user_db_id") or actor["sub"]))


def _serialize(row: asyncpg.Record) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "studentId": str(row["student_id"]),
        "studentName": row["student_name"],
        "learnerId": row["learner_id"] or "N/A",
        "termId": str(row["term_id"]),
        "classId": str(row["class_id"]) if row["class_id"] else None,
        "className": (
            format_class_name(row["level"], row["stream"])
            if row.get("level")
            else None
        ),
        "incidentDate": row["incident_date"].isoformat()
        if hasattr(row["incident_date"], "isoformat")
        else str(row["incident_date"]),
        "incidentType": row["incident_type"],
        "category": row["category"],
        "description": row["description"],
        "actionTaken": row["action_taken"],
        "recordedBy": str(row["recorded_by"]),
        "recordedByName": row["recorded_by_name"],
        "headTeacherRemarks": row["head_teacher_remarks"],
        "remarkedBy": str(row["remarked_by"]) if row["remarked_by"] else None,
        "remarkedByName": row.get("remarked_by_name"),
        "remarkedAt": row["remarked_at"].isoformat() if row["remarked_at"] else None,
        "status": row["status"],
        "createdAt": row["created_at"].isoformat() if row["created_at"] else None,
    }


INCIDENT_SELECT = """
    SELECT
      d.id,
      d.student_id,
      s.full_name AS student_name,
      s.learner_id,
      d.term_id,
      d.class_id,
      sc.level,
      sc.stream,
      d.incident_date,
      d.incident_type,
      d.category,
      d.description,
      d.action_taken,
      d.recorded_by,
      rb.full_name AS recorded_by_name,
      d.head_teacher_remarks,
      d.remarked_by,
      rm.full_name AS remarked_by_name,
      d.remarked_at,
      d.status,
      d.created_at
    FROM discipline_records d
    JOIN students s ON s.id = d.student_id
    LEFT JOIN school_classes sc ON sc.id = d.class_id
    LEFT JOIN users rb ON rb.id = d.recorded_by
    LEFT JOIN users rm ON rm.id = d.remarked_by
"""


async def _assert_can_access_student(
    conn: asyncpg.Connection,
    actor: dict[str, Any],
    student_id: uuid.UUID,
    school_id: uuid.UUID,
) -> dict[str, Any]:
    student = await conn.fetchrow(
        """
        SELECT id, full_name, learner_id, current_class_id, status
        FROM students
        WHERE id = $1 AND school_id = $2
        """,
        student_id,
        school_id,
    )
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Student not found.", "code": "NOT_FOUND"},
        )

    if actor["role"] in ADMIN_ROLES:
        return dict(student)

    actor_id = _actor_id(actor)
    class_id = student["current_class_id"]
    if not class_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "You do not have access to this student.", "code": "FORBIDDEN"},
        )
    allowed = await conn.fetchval(
        """
        SELECT EXISTS(
          SELECT 1 FROM teacher_class_assignments
          WHERE school_id = $1 AND teacher_id = $2 AND class_id = $3
        )
        OR EXISTS(
          SELECT 1 FROM timetable_periods
          WHERE school_id = $1 AND teacher_id = $2 AND class_id = $3
        )
        """,
        school_id,
        actor_id,
        class_id,
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "You do not have access to this student.", "code": "FORBIDDEN"},
        )
    return dict(student)


@router.post("")
async def create_incident(
    body: CreateIncidentBody,
    ctx: TenantCtx,
    conn: asyncpg.Connection = Depends(get_db),
):
    school_id, actor = ctx
    _require_allowed(actor)
    student = await _assert_can_access_student(conn, actor, body.student_id, school_id)
    actor_id = _actor_id(actor)
    parsed_date = datetime.strptime(body.incident_date, "%Y-%m-%d").date()

    class_id = body.class_id or student.get("current_class_id")

    incident_id = await conn.fetchval(
        """
        INSERT INTO discipline_records
          (school_id, student_id, term_id, class_id, incident_date, incident_type,
           category, description, action_taken, recorded_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
        """,
        school_id,
        body.student_id,
        body.term_id,
        class_id,
        parsed_date,
        body.incident_type,
        (body.category or "").strip() or None,
        body.description,
        (body.action_taken or "").strip() or None,
        actor_id,
    )

    row = await conn.fetchrow(
        f"{INCIDENT_SELECT} WHERE d.id = $1 AND d.school_id = $2",
        incident_id,
        school_id,
    )

    return {"data": _serialize(row)}


@router.get("")
async def list_incidents(
    ctx: TenantCtx,
    conn: asyncpg.Connection = Depends(get_db),
    term_id: Optional[uuid.UUID] = Query(None),
    incident_type: Optional[str] = Query(None),
    class_id: Optional[uuid.UUID] = Query(None),
    student_id: Optional[uuid.UUID] = Query(None),
    date_from: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    date_to: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    include_voided: bool = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
):
    school_id, actor = ctx
    _require_allowed(actor)

    if actor["role"] == "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "Teachers should use /discipline/mine or /discipline/student/{id}.",
                "code": "FORBIDDEN",
            },
        )

    if incident_type and incident_type not in INCIDENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Invalid incident_type.", "code": "VALIDATION_ERROR"},
        )

    conditions = ["d.school_id = $1"]
    params: list[Any] = [school_id]
    idx = 2

    if not include_voided:
        conditions.append("d.status = 'active'")

    if term_id:
        conditions.append(f"d.term_id = ${idx}")
        params.append(term_id)
        idx += 1
    if incident_type:
        conditions.append(f"d.incident_type = ${idx}")
        params.append(incident_type)
        idx += 1
    if class_id:
        conditions.append(f"d.class_id = ${idx}")
        params.append(class_id)
        idx += 1
    if student_id:
        conditions.append(f"d.student_id = ${idx}")
        params.append(student_id)
        idx += 1
    if date_from:
        conditions.append(f"d.incident_date >= ${idx}")
        params.append(datetime.strptime(date_from, "%Y-%m-%d").date())
        idx += 1
    if date_to:
        conditions.append(f"d.incident_date <= ${idx}")
        params.append(datetime.strptime(date_to, "%Y-%m-%d").date())
        idx += 1

    where_sql = " AND ".join(conditions)
    total = await conn.fetchval(
        f"SELECT COUNT(*)::int FROM discipline_records d WHERE {where_sql}",
        *params,
    )
    offset = (page - 1) * limit
    list_params = [*params, limit, offset]

    rows = await conn.fetch(
        f"""
        {INCIDENT_SELECT}
        WHERE {where_sql}
        ORDER BY d.incident_date DESC, d.created_at DESC
        LIMIT ${idx} OFFSET ${idx + 1}
        """,
        *list_params,
    )

    return {
        "data": {
            "items": [_serialize(r) for r in rows],
            "page": page,
            "limit": limit,
            "total": int(total or 0),
        }
    }


@router.get("/mine")
async def list_my_incidents(
    ctx: TenantCtx,
    conn: asyncpg.Connection = Depends(get_db),
    term_id: Optional[uuid.UUID] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
):
    school_id, actor = ctx
    _require_allowed(actor)
    actor_id = _actor_id(actor)

    conditions = ["d.school_id = $1", "d.recorded_by = $2", "d.status = 'active'"]
    params: list[Any] = [school_id, actor_id]
    idx = 3
    if term_id:
        conditions.append(f"d.term_id = ${idx}")
        params.append(term_id)
        idx += 1

    where_sql = " AND ".join(conditions)
    total = await conn.fetchval(
        f"SELECT COUNT(*)::int FROM discipline_records d WHERE {where_sql}",
        *params,
    )
    offset = (page - 1) * limit
    list_params = [*params, limit, offset]

    rows = await conn.fetch(
        f"""
        {INCIDENT_SELECT}
        WHERE {where_sql}
        ORDER BY d.incident_date DESC, d.created_at DESC
        LIMIT ${idx} OFFSET ${idx + 1}
        """,
        *list_params,
    )
    return {
        "data": {
            "items": [_serialize(r) for r in rows],
            "page": page,
            "limit": limit,
            "total": int(total or 0),
        }
    }


@router.get("/flags/repeat-offenders")
async def repeat_offenders(
    ctx: TenantCtx,
    conn: asyncpg.Connection = Depends(get_db),
    term_id: Optional[uuid.UUID] = Query(None),
):
    school_id, actor = ctx
    if actor["role"] not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Only admins and head teachers can view this flag.", "code": "FORBIDDEN"},
        )

    resolved_term = term_id or await get_current_term_id(conn, school_id)
    if not resolved_term:
        return {"data": {"termId": None, "threshold": MAJOR_FLAG_THRESHOLD, "students": []}}

    rows = await conn.fetch(
        """
        SELECT
          s.id AS student_id,
          s.full_name AS student_name,
          s.learner_id,
          sc.level,
          sc.stream,
          COUNT(*)::int AS major_count
        FROM discipline_records d
        JOIN students s ON s.id = d.student_id
        LEFT JOIN school_classes sc ON sc.id = s.current_class_id
        WHERE d.school_id = $1
          AND d.term_id = $2
          AND d.incident_type = 'major'
          AND d.status = 'active'
        GROUP BY s.id, s.full_name, s.learner_id, sc.level, sc.stream
        HAVING COUNT(*) >= $3
        ORDER BY major_count DESC, s.full_name ASC
        """,
        school_id,
        resolved_term,
        MAJOR_FLAG_THRESHOLD,
    )

    return {
        "data": {
            "termId": str(resolved_term),
            "threshold": MAJOR_FLAG_THRESHOLD,
            "students": [
                {
                    "studentId": str(r["student_id"]),
                    "studentName": r["student_name"],
                    "learnerId": r["learner_id"] or "N/A",
                    "className": format_class_name(r["level"] or "", r["stream"]) if r["level"] else None,
                    "majorCount": r["major_count"],
                }
                for r in rows
            ],
        }
    }


@router.get("/student/{student_id}")
async def student_incidents(
    student_id: uuid.UUID,
    ctx: TenantCtx,
    conn: asyncpg.Connection = Depends(get_db),
    term_id: Optional[uuid.UUID] = Query(None),
):
    school_id, actor = ctx
    _require_allowed(actor)
    await _assert_can_access_student(conn, actor, student_id, school_id)

    conditions = ["d.school_id = $1", "d.student_id = $2", "d.status = 'active'"]
    params: list[Any] = [school_id, student_id]
    if term_id:
        conditions.append("d.term_id = $3")
        params.append(term_id)

    rows = await conn.fetch(
        f"""
        {INCIDENT_SELECT}
        WHERE {" AND ".join(conditions)}
        ORDER BY d.incident_date DESC, d.created_at DESC
        """,
        *params,
    )

    majors = sum(1 for r in rows if r["incident_type"] == "major")
    minors = sum(1 for r in rows if r["incident_type"] == "minor")
    commendations = sum(1 for r in rows if r["incident_type"] == "commendation")

    return {
        "data": {
            "studentId": str(student_id),
            "summary": {
                "major": majors,
                "minor": minors,
                "commendation": commendations,
                "total": len(rows),
                "flagged": majors >= MAJOR_FLAG_THRESHOLD,
                "threshold": MAJOR_FLAG_THRESHOLD,
            },
            "incidents": [_serialize(r) for r in rows],
        }
    }


@router.patch("/{incident_id}/remarks")
async def add_remarks(
    incident_id: uuid.UUID,
    body: RemarksBody,
    ctx: TenantCtx,
    conn: asyncpg.Connection = Depends(get_db),
):
    school_id, actor = ctx
    if actor["role"] not in HEAD_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Only head teachers and admins can add remarks.", "code": "FORBIDDEN"},
        )

    actor_id = _actor_id(actor)
    updated = await conn.fetchrow(
        """
        UPDATE discipline_records
        SET head_teacher_remarks = $1,
            remarked_by = $2,
            remarked_at = NOW(),
            updated_at = NOW()
        WHERE id = $3 AND school_id = $4 AND status = 'active'
        RETURNING id
        """,
        body.remarks,
        actor_id,
        incident_id,
        school_id,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Incident not found.", "code": "NOT_FOUND"},
        )

    row = await conn.fetchrow(
        f"{INCIDENT_SELECT} WHERE d.id = $1 AND d.school_id = $2",
        incident_id,
        school_id,
    )
    return {"data": _serialize(row)}


@router.post("/{incident_id}/void")
async def void_incident(
    incident_id: uuid.UUID,
    body: VoidBody,
    ctx: TenantCtx,
    conn: asyncpg.Connection = Depends(get_db),
):
    school_id, actor = ctx
    if actor["role"] not in HEAD_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Only admins and head teachers can void incidents.", "code": "FORBIDDEN"},
        )

    actor_id = _actor_id(actor)
    updated = await conn.fetchrow(
        """
        UPDATE discipline_records
        SET status = 'voided',
            voided_reason = $1,
            voided_by = $2,
            voided_at = NOW(),
            updated_at = NOW()
        WHERE id = $3 AND school_id = $4 AND status = 'active'
        RETURNING id
        """,
        body.reason,
        actor_id,
        incident_id,
        school_id,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Incident not found or already voided.", "code": "NOT_FOUND"},
        )

    return {"data": {"id": str(incident_id), "status": "voided"}}
