import { jwtVerify } from "jose";
import { TENANT_ACCESS_COOKIE, TENANT_REFRESH_COOKIE } from "@makyschool/shared/constants";
import type { TenantJwtPayload } from "@makyschool/shared/types";
import type { NextRequest } from "next/server";

const TENANT_SECRET = new TextEncoder().encode(
  process.env.TENANT_JWT_SECRET ?? "dev-tenant-secret",
);

export async function getTenantPayloadFromRequest(
  request: NextRequest,
): Promise<TenantJwtPayload | null> {
  const token =
    request.cookies.get(TENANT_ACCESS_COOKIE)?.value ??
    request.cookies.get(TENANT_REFRESH_COOKIE)?.value;

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
