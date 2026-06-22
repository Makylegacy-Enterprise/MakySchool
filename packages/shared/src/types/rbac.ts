export type MakySchoolRole = "admin" | "head_teacher" | "teacher" | "learner";

export const MAKY_SCHOOL_ROLES: readonly MakySchoolRole[] = [
  "admin",
  "head_teacher",
  "teacher",
  "learner",
];

export function isMakySchoolRole(role: string): role is MakySchoolRole {
  return (MAKY_SCHOOL_ROLES as readonly string[]).includes(role);
}
