import uuid
from datetime import datetime

import asyncpg

UGANDA_TERMS = ("Term 1", "Term 2", "Term 3")


def subscriptions_enabled() -> bool:
    from app.config import settings

    return settings.SUBSCRIPTIONS_ENABLED or settings.NEXT_PUBLIC_SUBSCRIPTIONS_ENABLED


def resolve_billing_period(
    subscription_term: str | None,
    subscription_year: int | None,
) -> dict[str, str | int]:
    year = subscription_year or datetime.now().year
    if subscription_term:
        return {"term": subscription_term, "year": year}

    month = datetime.now().month
    if month >= 5 and month <= 8:
        term = UGANDA_TERMS[1]
    elif month >= 9:
        term = UGANDA_TERMS[2]
    else:
        term = UGANDA_TERMS[0]
    return {"term": term, "year": year}


async def resolve_required_billing_period(
    conn: asyncpg.Connection, school_id: uuid.UUID
) -> dict:
    calendar = await conn.fetchrow(
        """
        SELECT t.name, ay.year, t.start_date
        FROM terms t
        INNER JOIN academic_years ay ON ay.id = t.academic_year_id
        WHERE t.school_id = $1
          AND t.start_date IS NOT NULL
          AND t.start_date <= CURRENT_DATE
        ORDER BY ay.is_current DESC, t.start_date DESC
        LIMIT 1
        """,
        school_id,
    )
    if calendar:
        return {
            "term": calendar["name"],
            "year": calendar["year"],
            "source": "calendar",
            "term_start": calendar["start_date"],
        }

    school = await conn.fetchrow(
        "SELECT subscription_term, subscription_year FROM schools WHERE id = $1 LIMIT 1",
        school_id,
    )
    heuristic = resolve_billing_period(
        school["subscription_term"] if school else None,
        school["subscription_year"] if school else None,
    )
    return {
        **heuristic,
        "source": "heuristic",
        "term_start": None,
    }


def _is_paid_for_term(
    status: str,
    paid_term: str | None,
    paid_year: int | None,
    required_term: str,
    required_year: int,
) -> bool:
    return status == "active" and paid_term == required_term and paid_year == required_year


async def _log_subscription_audit(
    conn: asyncpg.Connection,
    *,
    school_id: uuid.UUID,
    action: str,
    previous_status: str,
    new_status: str,
    previous_term: str | None,
    previous_year: int | None,
    required_term: str,
    required_year: int,
    triggered_by: uuid.UUID | None = None,
    notes: str | None = None,
) -> None:
    await conn.execute(
        """
        INSERT INTO subscription_audit_logs (
            id, school_id, action, previous_status, new_status,
            previous_term, previous_year, required_term, required_year,
            triggered_by, notes
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        """,
        school_id,
        action,
        previous_status,
        new_status,
        previous_term,
        previous_year,
        required_term,
        required_year,
        triggered_by,
        notes,
    )


async def audit_school_subscription(
    conn: asyncpg.Connection,
    school_id: uuid.UUID,
    *,
    triggered_by: uuid.UUID | None = None,
    manual: bool = False,
) -> dict | None:
    if not subscriptions_enabled():
        return None

    school = await conn.fetchrow(
        """
        SELECT id, status, subscription_status, subscription_term, subscription_year
        FROM schools WHERE id = $1 LIMIT 1
        """,
        school_id,
    )
    if not school or school["status"] == "setup":
        return None

    required = await resolve_required_billing_period(conn, school_id)
    previous_status = school["subscription_status"]
    previous_term = school["subscription_term"]
    previous_year = school["subscription_year"]

    paid = _is_paid_for_term(
        school["subscription_status"],
        school["subscription_term"],
        school["subscription_year"],
        required["term"],
        required["year"],
    )
    if paid:
        return {
            "school_id": str(school_id),
            "changed": False,
            "previous_status": previous_status,
            "new_status": previous_status,
            "required_term": required["term"],
            "required_year": required["year"],
            "needs_payment": False,
        }

    new_status = school["subscription_status"]
    changed = False
    action = "audit_no_change"

    if manual:
        new_status = "unpaid" if school["subscription_status"] == "unpaid" else "expired"
        changed = True
        action = "manual_require_payment"
    elif school["subscription_status"] == "active":
        new_status = "expired"
        changed = True
        action = "auto_expire"
    elif (
        school["subscription_term"] != required["term"]
        or school["subscription_year"] != required["year"]
    ):
        new_status = "unpaid" if school["subscription_status"] == "unpaid" else "expired"
        changed = True
        action = "auto_align_term"

    term_changed = (
        school["subscription_term"] != required["term"]
        or school["subscription_year"] != required["year"]
    )

    if changed or term_changed or manual:
        await conn.execute(
            """
            UPDATE schools
            SET subscription_status = $1, subscription_term = $2, subscription_year = $3
            WHERE id = $4
            """,
            new_status,
            required["term"],
            required["year"],
            school_id,
        )
        if changed or manual:
            await _log_subscription_audit(
                conn,
                school_id=school_id,
                action=action,
                previous_status=previous_status,
                new_status=new_status,
                previous_term=previous_term,
                previous_year=previous_year,
                required_term=required["term"],
                required_year=required["year"],
                triggered_by=triggered_by,
                notes="Manual payment required" if manual else "Term rollover detected",
            )

    return {
        "school_id": str(school_id),
        "changed": changed or term_changed,
        "previous_status": previous_status,
        "new_status": new_status,
        "required_term": required["term"],
        "required_year": required["year"],
        "needs_payment": True,
    }


async def audit_all_school_subscriptions(
    conn: asyncpg.Connection, triggered_by: uuid.UUID | None = None
) -> dict:
    schools = await conn.fetch(
        "SELECT id FROM schools WHERE status <> 'setup' ORDER BY created_at ASC"
    )
    results = []
    changed_count = 0
    for school in schools:
        result = await audit_school_subscription(
            conn, school["id"], triggered_by=triggered_by
        )
        if result:
            results.append(result)
            if result["changed"]:
                changed_count += 1
    return {"scanned": len(results), "changed": changed_count, "results": results}


async def get_subscription_audit_overview(conn: asyncpg.Connection) -> dict:
    schools = await conn.fetch(
        """
        SELECT s.id, s.name, s.slug, s.status, s.subscription_status,
               s.subscription_term, s.subscription_year,
               COALESCE(u.email, '') AS admin_email
        FROM schools s
        LEFT JOIN LATERAL (
            SELECT email FROM users u
            WHERE u.school_id = s.id AND LOWER(u.role) = 'admin'
            ORDER BY u.created_at ASC LIMIT 1
        ) u ON true
        WHERE s.status <> 'setup'
        ORDER BY s.name ASC
        """
    )
    items = []
    for school in schools:
        required = await resolve_required_billing_period(conn, school["id"])
        needs_payment = not _is_paid_for_term(
            school["subscription_status"],
            school["subscription_term"],
            school["subscription_year"],
            required["term"],
            required["year"],
        )
        items.append(
            {
                "school_id": str(school["id"]),
                "name": school["name"],
                "slug": school["slug"],
                "status": school["status"],
                "subscription_status": school["subscription_status"],
                "paid_term": school["subscription_term"],
                "paid_year": school["subscription_year"],
                "required_term": required["term"],
                "required_year": required["year"],
                "term_source": required["source"],
                "term_start": required["term_start"],
                "needs_payment": needs_payment,
                "admin_email": school["admin_email"],
            }
        )
    return {
        "items": items,
        "summary": {
            "total": len(items),
            "needs_payment": sum(1 for i in items if i["needs_payment"]),
            "active": sum(1 for i in items if not i["needs_payment"]),
        },
    }


async def get_school_audit_history(
    conn: asyncpg.Connection, school_id: uuid.UUID, limit: int = 20
) -> list:
    rows = await conn.fetch(
        """
        SELECT l.id, l.action, l.previous_status, l.new_status,
               l.previous_term, l.previous_year, l.required_term, l.required_year,
               l.notes, l.created_at,
               sa.name AS triggered_by_name, sa.email AS triggered_by_email
        FROM subscription_audit_logs l
        LEFT JOIN super_admins sa ON sa.id = l.triggered_by
        WHERE l.school_id = $1
        ORDER BY l.created_at DESC
        LIMIT $2
        """,
        school_id,
        limit,
    )
    return [dict(r) for r in rows]
