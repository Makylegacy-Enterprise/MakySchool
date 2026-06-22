import { headers } from "next/headers";
import { DEFAULT_ROOT_DOMAIN } from "@makyschool/shared/constants";
import { AuthBrandPanel, fetchSchoolPreview } from "@/components/auth/AuthBrandPanel";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthLoginPanel } from "@/components/auth/AuthLoginPanel";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { getTenantFromHeaders } from "@/lib/tenant/server";
import { Suspense } from "react";

export default async function ResetPasswordPage() {
  const headerList = await headers();
  const tenant = getTenantFromHeaders(headerList);
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? DEFAULT_ROOT_DOMAIN;
  const schoolSlug = tenant?.schoolSlug;
  const school = schoolSlug ? await fetchSchoolPreview(schoolSlug) : null;

  return (
    <AuthLayout
      brandPanel={
        <AuthBrandPanel schoolSlug={schoolSlug} rootDomain={rootDomain} school={school} />
      }
    >
      <AuthLoginPanel title="Reset your password" subtitle="Choose a new password for your account.">
        <Suspense fallback={<p className="text-sm text-theme-muted">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </AuthLoginPanel>
    </AuthLayout>
  );
}
