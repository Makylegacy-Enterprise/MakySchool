USER_DISPLAY_NAME_SQL = "COALESCE(u.name, u.full_name)"
USER_ADMIN_ROLE_SQL = "LOWER(u.role) IN ('admin')"
USER_TEACHER_ROLE_SQL = "LOWER(u.role) IN ('teacher')"
USER_LEARNER_ROLE_SQL = "LOWER(u.role) IN ('learner', 'student')"

MAKY_SCHOOL_TENANT_ROLES = frozenset({"admin", "head_teacher", "teacher", "bursar", "learner"})


def normalize_user_role(role: str) -> str:
    value = role.lower()
    if value == "admin":
        return "admin"
    if value == "head_teacher":
        return "head_teacher"
    if value == "teacher":
        return "teacher"
    if value == "bursar":
        return "bursar"
    if value in ("student", "learner"):
        return "learner"
    return value


def is_maky_school_tenant_role(role: str) -> bool:
    return normalize_user_role(role) in MAKY_SCHOOL_TENANT_ROLES
