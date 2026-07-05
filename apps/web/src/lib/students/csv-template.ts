/** Standard student import CSV — keep in sync with apps/api/app/routers/students.py template endpoint. */
export const STUDENT_IMPORT_CSV_TEMPLATE = `name,dob,gender,class,parent_name,parent_phone,parent_email
John Doe,2015-03-12,male,S1A,James Doe,+256701234567,james@email.com
Jane Smith,2014-07-20,female,S1A,Grace Smith,+256702345678,`;

export function downloadStudentImportTemplate() {
  const blob = new Blob([STUDENT_IMPORT_CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "student_import_template.csv";
  link.click();
  URL.revokeObjectURL(url);
}
