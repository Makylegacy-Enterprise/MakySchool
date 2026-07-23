"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, CalendarDays, Search, Shield, Users } from "lucide-react";
import { formatClassLabel } from "@makyschool/shared/constants";
import { DashboardPage } from "@makyschool/ui/components/layout/DashboardPage";
import { EmptyState } from "@makyschool/ui/components/ui/EmptyState";
import { QueryState } from "@makyschool/ui/components/ui/QueryState";
import { Skeleton } from "@makyschool/ui/components/ui/Skeleton";
import { SkeletonTable } from "@makyschool/ui/components/ui/Skeleton";
import { useApiSWR } from "@/hooks/useApiSWR";
import { TeacherStudentAttendanceModal } from "@/components/teacher/TeacherStudentAttendanceModal";
import { LogDisciplineIncidentPanel } from "@/components/discipline/LogDisciplineIncidentPanel";

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
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [disciplineStudent, setDisciplineStudent] = useState<StudentRow | null>(null);
  const classQuery = useApiSWR<ClassDetail>(`/schools/classes/${classId}`);
  const studentsQuery = useApiSWR<StudentRow[]>(
    tab === "students" ? `/schools/classes/${classId}/students` : null,
  );

  const filteredStudents = useMemo(() => {
    const rows = studentsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.learner_id ?? "").toLowerCase().includes(q),
    );
  }, [studentsQuery.data, search]);

  return (
    <DashboardPage maxWidth="7xl" embedded>
      <QueryState
        error={classQuery.error}
        isLoading={classQuery.isLoading}
        data={classQuery.data}
        onRetry={() => void classQuery.mutate()}
        loading={
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-4 sm:grid-cols-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <SkeletonTable rows={4} />
          </div>
        }
        empty={
          <EmptyState
            title="Class not found"
            description="This class is not available or you do not have access."
            action={
              <Link href="/teacher/classes" className="ms-btn-secondary inline-flex">
                Back to my classes
              </Link>
            }
          />
        }
        isEmpty={() => false}
      >
        {(classData) => {
          const classLabel = formatClassLabel(classData.level, classData.stream);
          const taughtSubjects =
            classData.teacher_subjects?.length > 0
              ? classData.teacher_subjects
              : classData.subjects ?? [];

          return (
            <div className="space-y-6">
              <div>
                <Link
                  href="/teacher/classes"
                  className="text-xs text-theme-muted hover:text-theme-accent"
                >
                  ← Back to my classes
                </Link>
                <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h1 className="text-xl font-semibold text-theme-primary sm:text-2xl">
                      {classLabel}
                    </h1>
                    <p className="mt-1 text-sm text-theme-muted">
                      {taughtSubjects.map((subject) => subject.name).join(", ") ||
                        "No subjects assigned"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/teacher/attendance?classId=${classId}`}
                      className="ms-btn-secondary inline-flex items-center gap-2 text-sm"
                    >
                      <CalendarDays className="h-4 w-4" />
                      Take attendance
                    </Link>
                    <Link
                      href="/teacher/discipline"
                      className="ms-btn-ghost inline-flex items-center gap-2 text-sm"
                    >
                      <Shield className="h-4 w-4" />
                      My incidents
                    </Link>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-theme bg-theme-surface p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-theme-accent-muted text-theme-accent">
                      <Users className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs text-theme-muted">Students</p>
                      <p className="text-2xl font-semibold tabular-nums text-theme-primary">
                        {classData.student_count}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-theme bg-theme-surface p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-theme-icon text-theme-muted">
                      <BookOpen className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs text-theme-muted">Your subjects</p>
                      <p className="text-2xl font-semibold tabular-nums text-theme-primary">
                        {taughtSubjects.length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-theme bg-theme-surface p-4 sm:col-span-1">
                  <p className="text-xs text-theme-muted">Subjects you teach</p>
                  <p className="mt-2 line-clamp-2 text-sm font-medium text-theme-primary">
                    {taughtSubjects.map((s) => s.name).join(", ") || "—"}
                  </p>
                </div>
              </div>

              <div className="flex gap-1 overflow-x-auto border-b border-theme pb-px">
                {(
                  [
                    ["students", "Students"],
                    ["marks", "Marks"],
                    ["subjects", "Subjects"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
                      tab === key
                        ? "border-b-2 border-theme-accent text-theme-accent"
                        : "text-theme-muted hover:text-theme-primary"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === "students" ? (
                <div className="space-y-4">
                  <div className="relative max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-muted" />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name or learner ID"
                      className="ms-input w-full pl-9"
                    />
                  </div>

                  <QueryState
                    error={studentsQuery.error}
                    isLoading={studentsQuery.isLoading}
                    data={studentsQuery.data}
                    onRetry={() => void studentsQuery.mutate()}
                    loading={<SkeletonTable rows={5} />}
                    isEmpty={(rows) => rows.length === 0}
                    empty={
                      <EmptyState
                        title="No students in this class yet"
                        description="Students enrolled in this class will appear here."
                      />
                    }
                  >
                    {() =>
                      filteredStudents.length === 0 ? (
                        <EmptyState
                          title="No matching students"
                          description="Try a different name or learner ID."
                        />
                      ) : (
                        <>
                          <div className="hidden overflow-hidden rounded-xl border border-theme bg-theme-surface md:block">
                            <table className="ms-table w-full">
                              <thead className="bg-table-header text-xs font-medium uppercase tracking-wide text-theme-muted">
                                <tr>
                                  <th className="px-4 py-3 text-left">Name</th>
                                  <th className="px-4 py-3 text-left">Learner ID</th>
                                  <th className="px-4 py-3 text-left">Gender</th>
                                  <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredStudents.map((student) => (
                                  <tr
                                    key={student.id}
                                    className="border-t border-theme hover:bg-theme-raised/50"
                                  >
                                    <td className="px-4 py-3 font-medium text-theme-primary">
                                      {student.name}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-sm text-theme-muted">
                                      {student.learner_id || "—"}
                                    </td>
                                    <td className="px-4 py-3 capitalize text-theme-muted">
                                      {student.gender || "—"}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <div className="flex flex-wrap justify-end gap-3">
                                        <button
                                          type="button"
                                          className="text-sm font-semibold text-theme-accent hover:underline"
                                          onClick={() => setSelectedStudent(student)}
                                        >
                                          Attendance
                                        </button>
                                        <button
                                          type="button"
                                          className="text-sm font-semibold text-theme-primary hover:underline"
                                          onClick={() => setDisciplineStudent(student)}
                                        >
                                          Log incident
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="space-y-3 md:hidden">
                            {filteredStudents.map((student) => (
                              <article
                                key={student.id}
                                className="rounded-xl border border-theme bg-theme-surface p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="font-medium text-theme-primary">{student.name}</p>
                                    <p className="mt-0.5 font-mono text-xs text-theme-muted">
                                      {student.learner_id || "No learner ID"}
                                      {student.gender ? ` · ${student.gender}` : ""}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    className="ms-btn-secondary text-sm"
                                    onClick={() => setSelectedStudent(student)}
                                  >
                                    Attendance
                                  </button>
                                  <button
                                    type="button"
                                    className="ms-btn-ghost text-sm"
                                    onClick={() => setDisciplineStudent(student)}
                                  >
                                    Log incident
                                  </button>
                                </div>
                              </article>
                            ))}
                          </div>
                        </>
                      )
                    }
                  </QueryState>
                </div>
              ) : null}

              {tab === "marks" ? (
                <div className="rounded-xl border border-dashed border-theme bg-theme-surface px-5 py-10 text-center">
                  <p className="text-sm font-medium text-theme-primary">Marks entry coming soon</p>
                  <p className="mt-2 text-sm text-theme-muted">
                    You will be able to enter and submit term marks from here.
                  </p>
                </div>
              ) : null}

              {tab === "subjects" ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {taughtSubjects.length === 0 ? (
                    <div className="sm:col-span-2 lg:col-span-3">
                      <EmptyState
                        title="No subjects assigned"
                        description="Subjects you teach in this class will be listed here."
                      />
                    </div>
                  ) : (
                    taughtSubjects.map((subject) => (
                      <div
                        key={subject.id}
                        className="rounded-xl border border-theme bg-theme-surface px-4 py-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-theme-accent-muted text-theme-accent">
                            <BookOpen className="h-4 w-4" />
                          </span>
                          <p className="text-sm font-medium text-theme-primary">{subject.name}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : null}

              <TeacherStudentAttendanceModal
                open={!!selectedStudent}
                onClose={() => setSelectedStudent(null)}
                studentId={selectedStudent?.id ?? null}
                studentName={selectedStudent?.name ?? ""}
              />

              {disciplineStudent ? (
                <LogDisciplineIncidentPanel
                  open
                  onClose={() => setDisciplineStudent(null)}
                  studentId={disciplineStudent.id}
                  studentName={disciplineStudent.name}
                  classId={classId}
                />
              ) : null}
            </div>
          );
        }}
      </QueryState>
    </DashboardPage>
  );
}
