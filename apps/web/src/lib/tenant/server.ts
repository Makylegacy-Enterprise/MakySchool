import { TENANT_HEADERS } from "@makyschool/shared/constants";
import type { TenantContext } from "@makyschool/shared/types";
import { getTenantPayloadFromCookies } from "@/lib/auth/server-tenant";
import { getServerApiBaseUrl } from "@/lib/api/base-url";

type HeaderLike = Pick<Headers, "get">;

export function getTenantFromHeaders(headers: HeaderLike): TenantContext | null {
  const schoolSlug = headers.get(TENANT_HEADERS.SCHOOL_SLUG);
  if (!schoolSlug) {
    return null;
  }

  const schoolId = headers.get(TENANT_HEADERS.SCHOOL_ID) ?? undefined;

  return { schoolSlug, schoolId };
}

/** Resolves tenant from middleware headers, falling back to the session JWT on localhost. */
export async function getServerTenantContext(
  headers: HeaderLike,
): Promise<TenantContext | null> {
  const fromHeaders = getTenantFromHeaders(headers);
  if (fromHeaders) {
    return fromHeaders;
  }

  const payload = await getTenantPayloadFromCookies();
  if (!payload?.schoolSlug) {
    return null;
  }

  return {
    schoolSlug: payload.schoolSlug,
    schoolId: payload.schoolId,
  };
}

export function getApiUrl() {
  return getServerApiBaseUrl();
}
