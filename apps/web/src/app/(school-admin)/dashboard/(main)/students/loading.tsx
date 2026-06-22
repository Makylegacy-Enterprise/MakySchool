import { StudentTableSkeleton } from "@/components/school-admin/students/StudentRowSkeleton";

export default function StudentsLoadingPage() {
  return (
    <section className="space-y-6">
      <div className="h-14 animate-pulse rounded-xl bg-theme-raised" />
      <StudentTableSkeleton rows={8} />
    </section>
  );
}
