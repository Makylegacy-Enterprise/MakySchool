"use client";

import Link from "next/link";
import useSWR from "swr";
import { formatClassLabel, sortClasses } from "@makyschool/shared/constants";
import type { ClassWithDetails } from "@makyschool/shared/types";
import { apiClient } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/Skeleton";
import { useTenantSchool } from "@/providers/TenantSchoolProvider";

function statusForClass(classRow: ClassWithDetails) {
  if (classRow.capacity != null && classRow.student_count >= classRow.capacity) {
    return { label: "At capacity", tone: "badge-warning" as const };
  }
  if (classRow.subjects.length === 0) {
    return { label: "Needs subjects", tone: "badge-danger" as const };
  }
  return { label: "Active", tone: "badge-success" as const };
}

export function DashboardClassesTable() {
  const { school, schoolSlug } = useTenantSchool();

  const { data: classes, isLoading } = useSWR(
    schoolSlug ? ["/schools/classes", schoolSlug, "table"] : null,
    ([path, slug]) =>
      apiClient<ClassWithDetails[]>(path, { schoolSlug: slug }).then((r) => r.data),
  );

  const rows = classes ? sortClasses(classes, school?.school_type ?? null).slice(0, 8) : [];

  return (
    <section className="ms-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-theme px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-theme-primary">Class overview</h2>
          <p className="mt-0.5 text-xs text-theme-muted">Enrollment and subject status by class</p>
        </div>
        <Link href="/dashboard/classes" className="text-xs font-medium text-theme-accent hover:underline">
          View all
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2 p-5">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-theme-muted">
          No classes yet.{" "}
          <Link href="/dashboard/classes" className="font-medium text-theme-accent hover:underline">
            Create your first class
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-table-header text-xs uppercase tracking-wide text-theme-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Class</th>
                <th className="px-5 py-3 font-medium">Students</th>
                <th className="px-5 py-3 font-medium">Subjects</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {rows.map((classRow) => {
                const label = formatClassLabel(classRow.level, classRow.stream);
                const status = statusForClass(classRow);

                return (
                  <tr key={classRow.id} className="transition hover:bg-table-row-hover">
                    <td className="px-5 py-3.5 font-medium text-theme-primary">{label}</td>
                    <td className="px-5 py-3.5 text-theme-muted">
                      {classRow.student_count}
                      {classRow.capacity != null ? ` / ${classRow.capacity}` : ""}
                    </td>
                    <td className="px-5 py-3.5 text-theme-muted">{classRow.subjects.length}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.tone}`}
                      >
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
