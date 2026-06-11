import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import {
  TENANT_ACCESS_COOKIE,
  TENANT_REFRESH_COOKIE,
} from "@makyschool/shared/constants";
import type { TenantJwtPayload } from "@makyschool/shared/types";

const TENANT_SECRET = new TextEncoder().encode(
  process.env.TENANT_JWT_SECRET ?? "dev-tenant-secret",
);

export async function getTenantPayloadFromCookies(): Promise<TenantJwtPayload | null> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(TENANT_ACCESS_COOKIE)?.value ??
    cookieStore.get(TENANT_REFRESH_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, TENANT_SECRET);
    return payload as unknown as TenantJwtPayload;
  } catch {
    return null;
  }
}
