import { headers } from "next/headers";
import { DEFAULT_ROOT_DOMAIN } from "@makyschool/shared/constants";
import { AuthBrandPanel, fetchSchoolPreview } from "@/components/auth/AuthBrandPanel";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthLoginPanel } from "@/components/auth/AuthLoginPanel";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { getTenantFromHeaders } from "@/lib/tenant/server";

export default async function ForgotPasswordPage() {
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
      <AuthLoginPanel
        title="Forgot your password"
        subtitle="Enter your email and we'll send a reset link."
      >
        <ForgotPasswordForm />
      </AuthLoginPanel>
    </AuthLayout>
  );
}
