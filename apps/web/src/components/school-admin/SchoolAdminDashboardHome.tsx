"use client";

import { subscriptionsEnabled } from "@makyschool/shared/constants";
import { DashboardClassesTable } from "@/components/school-admin/DashboardClassesTable";
import { DashboardHero } from "@/components/school-admin/DashboardHero";
import { DashboardQuickActions } from "@/components/school-admin/DashboardQuickActions";
import { DashboardStatStrip } from "@/components/school-admin/DashboardStatStrip";
import { DashboardAnalyticsStrip } from "@/components/school-admin/DashboardAnalyticsStrip";
import { DisciplineRepeatOffendersBanner } from "@/components/school-admin/DisciplineRepeatOffendersBanner";
import { SubscriptionBanner } from "@/components/school-admin/SubscriptionBanner";
import { useSchool } from "@/providers/SchoolProvider";

export function SchoolAdminDashboardHome() {
  const { school } = useSchool();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {subscriptionsEnabled() ? <SubscriptionBanner /> : null}
      <DashboardHero school={school} />
      <DisciplineRepeatOffendersBanner />
      <DashboardQuickActions />
      <DashboardStatStrip />
      <DashboardAnalyticsStrip />
      <DashboardClassesTable />
    </div>
  );
}
