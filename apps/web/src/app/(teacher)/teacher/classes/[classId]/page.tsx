import { TeacherClassDetailContent } from "@/components/teacher/TeacherClassDetailContent";

type PageProps = {
  params: Promise<{ classId: string }>;
};

export default async function TeacherClassPage({ params }: PageProps) {
  const { classId } = await params;
  return <TeacherClassDetailContent classId={classId} />;
}
