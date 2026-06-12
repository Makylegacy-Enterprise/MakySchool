"use client";

import Link from "next/link";
import useSWR from "swr";
import { BookOpen, GraduationCap, Users } from "lucide-react";
import type { ClassWithDetails } from "@makyschool/shared/types";
import { apiClient } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTenantSchool } from "@/providers/TenantSchoolProvider";

export function DashboardStatStrip() {
  const { schoolSlug } = useTenantSchool();

  const { data: classes, isLoading: loadingClasses } = useSWR(
    schoolSlug ? ["/schools/classes", schoolSlug] : null,
    ([path, slug]) =>
      apiClient<ClassWithDetails[]>(path, { schoolSlug: slug }).then((r) => r.data),
  );

  const { data: subjects, isLoading: loadingSubjects } = useSWR(
    schoolSlug ? ["/schools/subjects", schoolSlug] : null,
    ([path, slug]) => apiClient<unknown[]>(path, { schoolSlug: slug }).then((r) => r.data),
  );

  const studentCount = classes?.reduce((sum, row) => sum + (row.student_count ?? 0), 0) ?? 0;

  const cards = [
    {
      key: "classes",
      label: "Classes",
      value: classes?.length ?? 0,
      icon: GraduationCap,
      href: "/dashboard/classes",
      tone: "bg-theme-accent-muted text-theme-accent",
    },
    {
      key: "subjects",
      label: "Subjects",
      value: subjects?.length ?? 0,
      icon: BookOpen,
      href: "/dashboard/classes",
      tone: "badge-info",
    },
    {
      key: "students",
      label: "Students",
      value: studentCount,
      icon: Users,
      href: "/dashboard/classes",
      tone: "bg-theme-icon text-theme-muted",
    },
  ] as const;

  if (loadingClasses || loadingSubjects) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-1">
        <Skeleton className="h-28 w-56 shrink-0 rounded-2xl" />
        <Skeleton className="h-28 w-56 shrink-0 rounded-2xl" />
        <Skeleton className="h-28 w-56 shrink-0 rounded-2xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-theme-primary">At a glance</h2>
        <Link href="/dashboard/classes" className="text-xs font-medium text-theme-accent hover:underline">
          View all
        </Link>
      </div>
      <div className="mt-4 flex gap-4 overflow-x-auto pb-1">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.key}
              href={card.href}
              className="ms-card group flex w-56 shrink-0 flex-col justify-between p-5 transition hover:border-accent-soft"
            >
              <div className="flex items-start justify-between">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-6">
                <p className="text-2xl font-semibold tabular-nums text-theme-primary">{card.value}</p>
                <p className="mt-1 text-sm text-theme-muted">{card.label}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
