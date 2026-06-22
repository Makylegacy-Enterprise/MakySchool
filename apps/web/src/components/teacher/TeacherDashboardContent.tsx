"use client";

import Link from "next/link";
import { BookOpen, Users } from "lucide-react";
import { formatClassLabel } from "@makyschool/shared/constants";
import { DashboardPage } from "@makyschool/ui/components/layout/DashboardPage";
import { EmptyState } from "@makyschool/ui/components/ui/EmptyState";
import { QueryState } from "@makyschool/ui/components/ui/QueryState";
import { Skeleton } from "@makyschool/ui/components/ui/Skeleton";
import { useApiSWR } from "@/hooks/useApiSWR";

type ClassRow = {
  id: string;
  level: string;
  stream: string | null;
  student_count: number;
  subjects: Array<{ id: string; name: string }>;
};

export function TeacherDashboardContent() {
  const { data, error, isLoading, mutate } = useApiSWR<ClassRow[]>("/schools/classes");

  return (
    <DashboardPage
      eyebrow="Teacher portal"
      title="Your dashboard"
      description="Classes and learners assigned to you."
      maxWidth="7xl"
    >
      <QueryState
        error={error}
        isLoading={isLoading}
        data={data}
        onRetry={() => void mutate()}
        loading={
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        }
        isEmpty={(classes) => classes.length === 0}
        empty={
          <EmptyState
            title="No classes assigned"
            description="Your school administrator will assign classes to you."
          />
        }
      >
        {(classes) => {
          const totalStudents = classes.reduce((sum, row) => sum + (row.student_count ?? 0), 0);

          return (
            <>
              <div className="mb-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-theme bg-theme-surface p-5">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-theme-accent" />
                    <div>
                      <p className="text-xs text-theme-muted">My classes</p>
                      <p className="text-2xl font-semibold text-theme-primary">{classes.length}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-theme bg-theme-surface p-5">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-theme-accent" />
                    <div>
                      <p className="text-xs text-theme-muted">Total students in my classes</p>
                      <p className="text-2xl font-semibold text-theme-primary">{totalStudents}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {classes.map((classRow) => (
                  <Link
                    key={classRow.id}
                    href={`/teacher/classes/${classRow.id}`}
                    className="rounded-xl border border-theme bg-theme-surface p-5 transition hover:border-theme-accent"
                  >
                    <h3 className="font-semibold text-theme-primary">
                      {formatClassLabel(classRow.level, classRow.stream)}
                    </h3>
                    <p className="mt-1 text-sm text-theme-muted">
                      {classRow.student_count} student{classRow.student_count === 1 ? "" : "s"}
                    </p>
                    <p className="mt-2 text-xs text-theme-faint">
                      {(classRow.subjects ?? []).map((s) => s.name).join(", ") || "No subjects linked"}
                    </p>
                  </Link>
                ))}
              </div>
            </>
          );
        }}
      </QueryState>
    </DashboardPage>
  );
}
