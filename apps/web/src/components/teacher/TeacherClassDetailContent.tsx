"use client";

import { useState } from "react";
import Link from "next/link";
import { formatClassLabel } from "@makyschool/shared/constants";
import { DashboardPage } from "@makyschool/ui/components/layout/DashboardPage";
import { EmptyState } from "@makyschool/ui/components/ui/EmptyState";
import { QueryState } from "@makyschool/ui/components/ui/QueryState";
import { SkeletonTable } from "@makyschool/ui/components/ui/Skeleton";
import { useApiSWR } from "@/hooks/useApiSWR";

type ClassDetail = {
  id: string;
  level: string;
  stream: string | null;
  student_count: number;
  subjects: Array<{ id: string; name: string }>;
  teacher_subjects: Array<{ id: string; name: string }>;
};

type StudentRow = {
  id: string;
  name: string;
  learner_id: string | null;
  gender: string | null;
};

type Tab = "students" | "marks" | "subjects";

export function TeacherClassDetailContent({ classId }: { classId: string }) {
  const [tab, setTab] = useState<Tab>("students");
  const classQuery = useApiSWR<ClassDetail>(`/schools/classes/${classId}`);
  const studentsQuery = useApiSWR<StudentRow[]>(
    tab === "students" ? `/schools/classes/${classId}/students` : null,
  );

  return (
    <DashboardPage maxWidth="7xl">
      <QueryState
        error={classQuery.error}
        isLoading={classQuery.isLoading}
        data={classQuery.data}
        onRetry={() => void classQuery.mutate()}
        loading={<SkeletonTable rows={4} />}
        empty={<EmptyState title="Class not found" description="This class is not available." />}
        isEmpty={() => false}
      >
        {(classData) => (
          <>
            <Link href="/teacher/dashboard" className="text-xs text-theme-muted hover:text-theme-accent">
              ← Back to dashboard
            </Link>
            <h1 className="mt-2 text-xl font-semibold text-theme-primary">
              {formatClassLabel(classData.level, classData.stream)}
            </h1>

            <div className="mb-6 mt-4 flex gap-2 border-b border-theme pb-3">
              {(
                [
                  ["students", "Students"],
                  ["marks", "Marks Entry"],
                  ["subjects", "Subjects"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    tab === key ? "bg-theme-accent text-on-accent" : "text-theme-muted hover:bg-nav-hover"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "students" ? (
              <QueryState
                error={studentsQuery.error}
                isLoading={studentsQuery.isLoading}
                data={studentsQuery.data}
                onRetry={() => void studentsQuery.mutate()}
                loading={<SkeletonTable rows={5} />}
                isEmpty={(rows) => rows.length === 0}
                empty={
                  <EmptyState
                    title="No students yet"
                    description="TODO: Ssekyanzi — student list Week 2"
                  />
                }
              >
                {(rows) => (
                  <div className="overflow-hidden rounded-xl border border-theme">
                    <table className="ms-table w-full">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Learner ID</th>
                          <th>Gender</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((student) => (
                          <tr key={student.id}>
                            <td>{student.name}</td>
                            <td>{student.learner_id || "—"}</td>
                            <td>{student.gender || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </QueryState>
            ) : null}

            {tab === "marks" ? (
              <div className="rounded-xl border border-dashed border-theme bg-theme-surface px-5 py-8 text-center">
                <p className="text-sm text-theme-muted">TODO: Kweko — Marks entry Week 2</p>
              </div>
            ) : null}

            {tab === "subjects" ? (
              <ul className="space-y-2">
                {(classData.teacher_subjects?.length
                  ? classData.teacher_subjects
                  : classData.subjects ?? []
                ).map((subject) => (
                  <li
                    key={subject.id}
                    className="rounded-lg border border-theme bg-theme-surface px-4 py-3 text-sm text-theme-primary"
                  >
                    {subject.name}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </QueryState>
    </DashboardPage>
  );
}
