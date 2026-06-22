import type { MakySchoolRole } from "@makyschool/shared/types";

export function roleBadgeClass(role: MakySchoolRole | string) {
  switch (role) {
    case "admin":
      return "badge-info";
    case "head_teacher":
      return "badge-role-ht";
    case "teacher":
      return "badge-role-teacher";
    case "bursar":
      return "badge-role-bursar";
    default:
      return "badge-info";
  }
}

export function roleLabel(role: MakySchoolRole | string) {
  switch (role) {
    case "admin":
      return "Admin";
    case "head_teacher":
      return "Head Teacher";
    case "teacher":
      return "Teacher";
    case "bursar":
      return "Bursar";
    case "learner":
      return "Learner";
    default:
      return role;
  }
}

export function formatClassAssignmentLabel(
  item: { class_name?: string; level?: string; stream?: string | null; subject_name?: string | null },
) {
  const name = item.class_name ?? item.level ?? "Class";
  const stream = item.stream ? ` ${item.stream}` : "";
  const subject = item.subject_name ? ` (${item.subject_name})` : "";
  return `${name}${stream}${subject}`;
}
