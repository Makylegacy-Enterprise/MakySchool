import { notFound } from "next/navigation";
import { DashboardPage } from "@makyschool/ui/components/layout/DashboardPage";
import { SchoolDetail } from "@/components/schools/SchoolDetail";
import { apiFetch } from "@/lib/api/server";

type SchoolDetailPayload = {
  school: Parameters<typeof SchoolDetail>[0]["school"];
  admin: Parameters<typeof SchoolDetail>[0]["admin"];
  subscriptionHistory: Parameters<typeof SchoolDetail>[0]["subscriptionHistory"];
  counts: Parameters<typeof SchoolDetail>[0]["counts"];
  setupStatus: Parameters<typeof SchoolDetail>[0]["setupStatus"];
};

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let school: SchoolDetailPayload;

  try {
    school = await apiFetch<SchoolDetailPayload>(`/superadmin/schools/${id}`);
  } catch {
    notFound();
  }

  return (
    <DashboardPage
      eyebrow="Schools"
      title={school.school.name ?? "Unnamed school"}
      description={`${school.school.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "school.makylegacy.com"}`}
    >
      <SchoolDetail {...school} />
    </DashboardPage>
  );
}
