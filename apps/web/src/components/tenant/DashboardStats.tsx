"use client";

import Link from "next/link";
import useSWR from "swr";
import { BookOpen, GraduationCap, Users } from "lucide-react";
import type { ClassWithDetails } from "@makyschool/shared/types";
import { apiClient } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTenantSchool } from "@/providers/TenantSchoolProvider";

export function DashboardStats() {
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

  const studentCount = classes?.reduce((sum, c) => sum + (c.student_count ?? 0), 0) ?? 0;

  const cards = [
    {
      key: "classes",
      label: "Classes",
      value: classes?.length ?? 0,
      icon: GraduationCap,
      href: "/dashboard/classes",
      accent: "text-[#4F6EF7]",
      bg: "bg-[#1E2A5E]",
    },
    {
      key: "subjects",
      label: "Subjects",
      value: subjects?.length ?? 0,
      icon: BookOpen,
      href: "/dashboard/classes",
      accent: "text-[#93ACFF]",
      bg: "bg-[#1E2A5E]",
    },
    {
      key: "students",
      label: "Enrolled students",
      value: studentCount,
      icon: Users,
      href: "/dashboard/classes",
      accent: "text-[#8B90A7]",
      bg: "bg-[#252A3A]",
    },
  ] as const;

  if (loadingClasses || loadingSubjects) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl sm:col-span-2 lg:col-span-1" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.key}
            href={card.href}
            className="group rounded-xl border border-[#252A3A] bg-[#181C27] p-5 transition hover:border-[#3D4357]"
          >
            <div className="flex items-center justify-between">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg} ${card.accent} transition group-hover:scale-105`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#8B90A7]">
                {card.label}
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold tabular-nums text-[#F0F2FA]">
              {card.value}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
