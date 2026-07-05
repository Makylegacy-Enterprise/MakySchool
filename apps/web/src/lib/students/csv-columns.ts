/** CSV column aliases — keep in sync with apps/api/app/services/students/import_csv.py */
export const CSV_REQUIRED_COLUMNS = ["name", "class", "parent_name"] as const;

export const CSV_COLUMN_ALIASES: Record<string, readonly string[]> = {
  name: ["name", "full_name", "student_name", "student", "learner_name"],
  dob: ["dob", "date_of_birth", "birth_date", "birthdate"],
  gender: ["gender", "sex"],
  class: ["class", "class_name", "grade", "form"],
  parent_name: ["parent_name", "guardian_name", "parent", "guardian"],
  parent_phone: ["parent_phone", "guardian_phone", "phone", "contact_phone"],
  parent_email: ["parent_email", "guardian_email", "email", "contact_email"],
  guardian_relationship: ["guardian_relationship", "relationship", "parent_relationship"],
};

/** Normalize headers from Excel/Sheets exports (spaces, quotes, BOM). */
export function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

function resolveCanonicalHeader(header: string): string | null {
  const normalized = normalizeHeader(header);
  for (const [canonical, aliases] of Object.entries(CSV_COLUMN_ALIASES)) {
    if (aliases.includes(normalized)) {
      return canonical;
    }
  }
  return null;
}

export function mapCsvHeaders(headers: string[]): Set<string> {
  const canonical = new Set<string>();
  for (const header of headers) {
    const mapped = resolveCanonicalHeader(header);
    if (mapped) {
      canonical.add(mapped);
    }
  }
  return canonical;
}

export function missingRequiredCsvColumns(headers: string[]): string[] {
  const canonical = mapCsvHeaders(headers);
  return CSV_REQUIRED_COLUMNS.filter((column) => !canonical.has(column));
}

export function normalizeCsvHeaderRow(row: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const canonical = resolveCanonicalHeader(key);
    if (canonical) {
      mapped[canonical] = (value ?? "").trim();
    }
  }
  return mapped;
}
