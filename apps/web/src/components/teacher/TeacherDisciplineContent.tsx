"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Shield } from "lucide-react";
import { DashboardPage } from "@makyschool/ui/components/layout/DashboardPage";
import { EmptyState } from "@makyschool/ui/components/ui/EmptyState";
import { Skeleton } from "@makyschool/ui/components/ui/Skeleton";
import { TablePagination } from "@makyschool/ui/components/ui/TablePagination";
import { useMyDisciplineIncidents } from "@/hooks/useDiscipline";
import { useCurrentTerm } from "@/hooks/useCurrentTerm";
import type { DisciplineIncidentType } from "@makyschool/shared";
import { DEFAULT_PAGE_SIZE } from "@makyschool/shared/constants";

const TYPE_BADGE: { [K in DisciplineIncidentType]: string } = {
  minor: "badge-warning",
  major: "badge-danger",
  commendation: "badge-success",
};

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function TeacherDisciplineContent() {
  const { data: term } = useCurrentTerm();
  const termId = term?.id ?? "";
  const [incidentType, setIncidentType] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [incidentType, termId, pageSize]);

  const { data, isPending, isError, refetch } = useMyDisciplineIncidents(
    { termId: termId || undefined, page, limit: pageSize },
    !!termId,
  );

  const incidents = data?.items ?? [];
  const total = data?.total ?? 0;

  const rows = useMemo(() => {
    if (!incidentType) return incidents;
    return incidents.filter((i) => i.incidentType === incidentType);
  }, [incidents, incidentType]);

  return (
    <DashboardPage
      embedded
      maxWidth="7xl"
      eyebrow="Teacher portal"
      title="Discipline"
      description={
        term?.name
          ? `Incidents you logged this term · ${term.name}`
          : "Incidents you have logged for your classes"
      }
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-theme bg-theme-surface px-4 py-3 sm:max-w-xs">
          <p className="text-xs text-theme-muted">Logged this term</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-theme-primary">{total}</p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-theme bg-theme-raised/40 p-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="block sm:min-w-[12rem]">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-theme-muted">
              Type
            </span>
            <select
              className="ms-input w-full"
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
            >
              <option value="">All types</option>
              <option value="major">Major</option>
              <option value="minor">Minor</option>
              <option value="commendation">Commendation</option>
            </select>
          </label>
          <p className="text-sm text-theme-muted sm:text-right">
            Log new incidents from a{" "}
            <Link href="/teacher/classes" className="font-semibold text-theme-accent hover:underline">
              class roster
            </Link>
            .
          </p>
        </div>

        {!termId ? (
          <EmptyState title="No current term" description="Ask your administrator to set the current term." />
        ) : isPending ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : isError ? (
          <EmptyState
            variant="error"
            title="Couldn’t load your incidents"
            description="Check your connection and try again."
            onRetry={() => void refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No incidents logged yet"
            description="Open a class, pick a student, and use Log incident to record discipline or commendations."
            action={
              <Link href="/teacher/classes" className="ms-btn-secondary inline-flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Go to my classes
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="hidden overflow-hidden rounded-xl border border-theme bg-theme-surface md:block">
              <div className="overflow-x-auto">
                <table className="ms-table w-full min-w-[40rem]">
                  <thead className="bg-table-header text-xs font-medium uppercase tracking-wide text-theme-muted">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Student</th>
                      <th className="px-4 py-3 text-left">Class</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((inc) => (
                      <tr key={inc.id} className="border-t border-theme align-top hover:bg-theme-raised/40">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-theme-primary">
                          {formatDate(inc.incidentDate)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-theme-primary">{inc.studentName}</p>
                          <p className="font-mono text-[11px] text-theme-muted">{inc.learnerId}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-theme-muted">{inc.className || "—"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${TYPE_BADGE[inc.incidentType]}`}
                          >
                            {inc.incidentType}
                          </span>
                        </td>
                        <td className="max-w-sm px-4 py-3 text-sm text-theme-primary">
                          <p className="line-clamp-2">{inc.description}</p>
                          {inc.actionTaken ? (
                            <p className="mt-1 text-xs text-theme-muted">Action: {inc.actionTaken}</p>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {rows.map((inc) => (
                <article
                  key={inc.id}
                  className="rounded-xl border border-theme bg-theme-surface p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-theme-primary">{inc.studentName}</p>
                      <p className="mt-0.5 text-xs text-theme-muted">
                        {formatDate(inc.incidentDate)}
                        {inc.className ? ` · ${inc.className}` : ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${TYPE_BADGE[inc.incidentType]}`}
                    >
                      {inc.incidentType}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-theme-primary">{inc.description}</p>
                  {inc.actionTaken ? (
                    <p className="mt-2 text-xs text-theme-muted">Action: {inc.actionTaken}</p>
                  ) : null}
                </article>
              ))}
            </div>

            {!incidentType ? (
              <TablePagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                noun="incidents"
              />
            ) : null}
          </div>
        )}

        <div className="flex items-start gap-3 rounded-xl border border-dashed border-theme bg-theme-surface px-4 py-4">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-theme-accent" />
          <div>
            <p className="text-sm font-medium text-theme-primary">How to log an incident</p>
            <p className="mt-1 text-sm text-theme-muted">
              Open My classes → select a class → Students → Log incident next to a learner.
            </p>
          </div>
        </div>
      </div>
    </DashboardPage>
  );
}
