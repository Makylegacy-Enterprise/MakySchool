import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { WizardShell } from "@/components/setup/WizardShell";
import { apiFetch } from "@/lib/api/server";
import { getServerTenantContext } from "@/lib/tenant/server";
import type { SetupStatusResponse } from "@makyschool/shared/types";

export default async function SetupPage() {
  const headerList = await headers();
  const tenant = await getServerTenantContext(headerList);

  if (!tenant?.schoolSlug) {
    redirect("/login");
  }

  let payload: SetupStatusResponse | null = null;

  try {
    payload = await apiFetch<SetupStatusResponse>("/schools/setup/status", {
      schoolSlug: tenant.schoolSlug,
    });
  } catch {
    payload = null;
  }

  if (payload?.completed) {
    redirect("/dashboard");
  }

  const schoolId = payload?.school?.id ?? tenant.schoolId;
  if (!schoolId) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#0F1117]">
      <header className="border-b border-[#252A3A] px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4F6EF7] text-xs font-bold text-white">
              MS
            </span>
            <div>
              <p className="text-sm font-semibold text-[#F0F2FA]">MakySchool</p>
              <p className="text-xs text-[#8B90A7]">School setup</p>
            </div>
          </div>
          <span className="rounded-full bg-[#1E2A5E] px-2.5 py-1 font-mono text-xs text-[#93ACFF]">
            {tenant.schoolSlug}
          </span>
        </div>
      </header>

      <WizardShell
        school={payload?.school}
        schoolSlug={tenant.schoolSlug}
        schoolId={schoolId}
      />
    </div>
  );
}
