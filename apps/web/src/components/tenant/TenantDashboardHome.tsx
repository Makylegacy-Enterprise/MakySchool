"use client";

import { subscriptionsEnabled } from "@makyschool/shared/constants";
import { DashboardClassesTable } from "@/components/tenant/DashboardClassesTable";
import { DashboardHero } from "@/components/tenant/DashboardHero";
import { DashboardStatStrip } from "@/components/tenant/DashboardStatStrip";
import { SubscriptionBanner } from "@/components/tenant/SubscriptionBanner";
import { useTenantSchool } from "@/providers/TenantSchoolProvider";

export function TenantDashboardHome() {
  const { school } = useTenantSchool();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {subscriptionsEnabled() ? <SubscriptionBanner /> : null}
      <DashboardHero school={school} />
      <DashboardStatStrip />
      <DashboardClassesTable />
    </div>
  );
}
