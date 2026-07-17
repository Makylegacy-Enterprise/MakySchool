import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { TENANT_ACCESS_COOKIE, TENANT_REFRESH_COOKIE } from "@makyschool/shared/constants";

const TENANT_SECRET = new TextEncoder().encode(
  process.env.TENANT_JWT_SECRET ?? "dev-tenant-secret",
);

export async function GET(request: Request) {
  // Generate a dev login token for Chem Teacher
  const payload = {
    sub: "50f4bc9f-fc1f-4e61-a921-890f2d5b0337",
    schoolId: "2e4892fd-ede0-4c1a-8807-6689578e6701",
    schoolSlug: "yumbe-ss",
    role: "teacher",
    email: "chem@gmail.com",
    name: "Chem Teacher",
    setupCompleted: true,
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(TENANT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(TENANT_ACCESS_COOKIE, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: false, // local development
  });

  return NextResponse.redirect(new URL("/teacher/attendance", request.url));
}
