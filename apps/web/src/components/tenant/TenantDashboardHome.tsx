"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, Settings2 } from "lucide-react";
import { subscriptionsEnabled } from "@makyschool/shared/constants";
import { DashboardStats } from "@/components/tenant/DashboardStats";
import { SubscriptionBanner } from "@/components/tenant/SubscriptionBanner";
import { useTenantSchool } from "@/providers/TenantSchoolProvider";

function schoolTypeLabel(type: string | null | undefined) {
  if (!type) return "School";
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
}

export function TenantDashboardHome() {
  const { school } = useTenantSchool();

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 overflow-hidden rounded-2xl border border-[#252A3A] bg-[#181C27]">
          <div className="relative px-5 py-6 sm:px-6 sm:py-7">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse 80% 60% at 100% 0%, rgba(79,110,247,0.18), transparent 55%)",
              }}
            />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                {school?.logo_url ? (
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#252A3A] bg-[#0F1117]">
                    <Image
                      src={school.logo_url}
                      alt=""
                      fill
                      className="object-contain p-1.5"
                      unoptimized
                    />
                  </div>
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#252A3A] bg-[#1E2A5E] text-lg font-bold text-[#4F6EF7]">
                    {(school?.name ?? "S").charAt(0).toUpperCase()}
                  </span>
                )}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[#8B90A7]">
                    School admin
                  </p>
                  <h1 className="mt-1 text-xl font-semibold text-[#F0F2FA] sm:text-2xl">
                    {school?.name ?? "Dashboard"}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full border border-[#252A3A] bg-[#0F1117] px-2.5 py-0.5 text-xs font-medium text-[#8B90A7]">
                      {schoolTypeLabel(school?.school_type)}
                    </span>
                    {school?.status === "active" ? (
                      <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                        Active
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <Link
                href="/dashboard/classes"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#4F6EF7] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#3D5CE6]"
              >
                Manage classes
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {subscriptionsEnabled() ? <SubscriptionBanner /> : null}
          <DashboardStats />

          <div>
            <h2 className="text-sm font-semibold text-[#F0F2FA]">Quick actions</h2>
            <p className="mt-0.5 text-sm text-[#8B90A7]">
              Common tasks for managing your school.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Link
                href="/dashboard/classes"
                className="group flex items-start gap-4 rounded-xl border border-[#252A3A] bg-[#181C27] p-5 transition hover:border-[#4F6EF7]/40 hover:bg-[#1A1F2E]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1E2A5E] text-[#4F6EF7] transition group-hover:bg-[#4F6EF7] group-hover:text-white">
                  <BookOpen className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-[#F0F2FA]">Classes & subjects</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#8B90A7]">
                    Create class levels, streams, and link subjects to each class.
                  </p>
                </div>
              </Link>

              <div className="flex items-start gap-4 rounded-xl border border-dashed border-[#252A3A] bg-[#0F1117]/50 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#252A3A] text-[#8B90A7]">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-[#F0F2FA]">Teachers & students</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#8B90A7]">
                    User management is coming soon. Schools are provisioned by your platform team.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-xl border border-dashed border-[#252A3A] bg-[#0F1117]/50 p-5 md:col-span-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#252A3A] text-[#8B90A7]">
                  <Settings2 className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-[#F0F2FA]">School profile</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#8B90A7]">
                    Logo, academic year, and grading settings were configured during setup. Profile
                    editing will be available in a future release.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
