import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { TenantSidebar } from "@/components/layout/TenantSidebar";
import { SubscriptionLockout } from "@/components/tenant/SubscriptionLockout";
import { TenantSchoolProvider } from "@/providers/TenantSchoolProvider";
import { apiFetch } from "@/lib/api/server";
import { getServerTenantContext } from "@/lib/tenant/server";
import type { SetupStatusResponse } from "@makyschool/shared/types";

export default async function TenantDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const tenant = await getServerTenantContext(headerList);
  const isSetupWizard = headerList.get("x-makyschool-setup") === "1";

  if (!tenant?.schoolSlug) {
    redirect("/login");
  }

  let status: SetupStatusResponse | null = null;

  try {
    status = await apiFetch<SetupStatusResponse>("/schools/setup/status", {
      schoolSlug: tenant.schoolSlug,
    });
  } catch {
    status = null;
  }

  if (isSetupWizard) {
    return (
      <TenantSchoolProvider
        schoolSlug={tenant.schoolSlug}
        school={status?.school ?? null}
        setupStatus={status}
      >
        {children}
      </TenantSchoolProvider>
    );
  }

  return (
    <TenantSchoolProvider
      schoolSlug={tenant.schoolSlug}
      school={status?.school ?? null}
      setupStatus={status}
    >
      <DashboardShell sidebar={<TenantSidebar schoolSlug={tenant.schoolSlug} schoolStatus={status?.school?.status} />}>
        <div className="flex-1">{children}</div>
        <SubscriptionLockout />
      </DashboardShell>
    </TenantSchoolProvider>
  );
}
