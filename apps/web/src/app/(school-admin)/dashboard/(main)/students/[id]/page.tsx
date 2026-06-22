import { StudentDetailContent } from "@/components/school-admin/students/StudentDetailContent";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StudentDetailContent studentId={id} />;
}
