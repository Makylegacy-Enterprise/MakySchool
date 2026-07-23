'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Shield } from 'lucide-react';
import { EmptyState } from '@makyschool/ui/components/ui/EmptyState';
import { Skeleton } from '@makyschool/ui/components/ui/Skeleton';
import { TablePagination } from '@makyschool/ui/components/ui/TablePagination';
import { useDisciplineList, useRepeatOffenders } from '@/hooks/useDiscipline';
import { useCurrentTerm } from '@/hooks/useCurrentTerm';
import type { DisciplineIncidentType } from '@makyschool/shared';
import { DEFAULT_PAGE_SIZE } from '@makyschool/shared/constants';
import { todayEAT } from '@/lib/api/attendance';

const TYPE_BADGE: { [K in DisciplineIncidentType]: string } = {
  minor: 'badge-warning',
  major: 'badge-danger',
  commendation: 'badge-success',
};

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function DisciplineRegistryContent() {
  const searchParams = useSearchParams();
  const flaggedOnly = searchParams.get('flagged') === '1';

  const { data: term } = useCurrentTerm();
  const termId = term?.id ?? '';

  const [incidentType, setIncidentType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState(todayEAT());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    if (term?.startDate) setDateFrom(term.startDate);
  }, [term?.startDate]);

  useEffect(() => {
    setPage(1);
  }, [incidentType, dateFrom, dateTo, flaggedOnly, termId, pageSize]);

  const { data: flags } = useRepeatOffenders(termId, !!termId);
  const flaggedIds = useMemo(
    () => new Set((flags?.students ?? []).map((s) => s.studentId)),
    [flags],
  );

  const { data, isPending, isError, refetch } = useDisciplineList(
    {
      termId: termId || undefined,
      incidentType: incidentType || (flaggedOnly ? 'major' : undefined),
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      limit: pageSize,
    },
    !!termId,
  );

  const incidents = data?.items ?? [];
  const total = data?.total ?? 0;

  const rows = useMemo(() => {
    if (!flaggedOnly) return incidents;
    return incidents.filter((i) => flaggedIds.has(i.studentId));
  }, [incidents, flaggedOnly, flaggedIds]);

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 border-b border-theme pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-theme-accent-muted">
            <Shield className="h-5 w-5 text-theme-accent" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-theme-primary">
              Discipline registry
            </h1>
            <p className="text-xs text-theme-muted">
              School-wide incidents and commendations{term?.name ? ` · ${term.name}` : ''}
            </p>
          </div>
        </div>
        <p className="text-xs text-theme-muted">
          Log incidents from a{' '}
          <Link href="/dashboard/students" className="font-semibold text-theme-accent hover:underline">
            student profile
          </Link>
          .
        </p>
      </div>

      {(flags?.students.length ?? 0) > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-theme bg-theme-danger-bg/50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-theme-danger" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-theme-danger">
              {flags!.students.length} student{flags!.students.length === 1 ? '' : 's'} with{' '}
              {flags!.threshold}+ major offences this term
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {flags!.students.map((s) => (
                <Link
                  key={s.studentId}
                  href={`/dashboard/students/${s.studentId}`}
                  className="rounded-full border border-theme bg-theme-surface px-3 py-1 text-xs font-medium text-theme-primary hover:border-theme-accent"
                >
                  {s.studentName} · {s.majorCount} majors
                </Link>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row flex-wrap gap-4 rounded-xl border border-theme bg-theme-raised/40 p-4 sm:items-end">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-theme-muted">
            Type
          </span>
          <select
            className="ms-input"
            value={incidentType}
            onChange={(e) => setIncidentType(e.target.value)}
          >
            <option value="">All types</option>
            <option value="major">Major</option>
            <option value="minor">Minor</option>
            <option value="commendation">Commendation</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-theme-muted">
            From
          </span>
          <input
            type="date"
            className="ms-input"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-theme-muted">
            To
          </span>
          <input
            type="date"
            className="ms-input"
            value={dateTo}
            max={todayEAT()}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
        {flaggedOnly && (
          <Link href="/dashboard/discipline" className="ms-btn-secondary text-sm">
            Clear flag filter
          </Link>
        )}
      </div>

      {!termId ? (
        <EmptyState title="No current term" description="Set the current academic term first." />
      ) : isPending ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : isError ? (
        <EmptyState
          variant="error"
          title="Couldn’t load incidents"
          description="Check your connection and try again."
          onRetry={() => void refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No incidents found"
          description="Adjust filters or log an incident from a student profile."
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-theme bg-theme-surface">
            <div className="overflow-x-auto">
              <table className="ms-table w-full min-w-[56rem]">
                <thead className="bg-table-header text-xs font-medium uppercase tracking-wide text-theme-muted">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">Class</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-left">Recorded by</th>
                    <th className="px-4 py-3 text-left">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((inc) => (
                    <tr key={inc.id} className="border-t border-theme align-top hover:bg-theme-raised/40">
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-theme-primary">
                        {formatDate(inc.incidentDate)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/students/${inc.studentId}`}
                          className="font-medium text-theme-accent hover:underline"
                        >
                          {inc.studentName}
                        </Link>
                        <p className="font-mono text-[11px] text-theme-muted">{inc.learnerId}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-muted">{inc.className || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${TYPE_BADGE[inc.incidentType]}`}>
                          {inc.incidentType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-primary max-w-sm">
                        <p className="line-clamp-2">{inc.description}</p>
                        {inc.actionTaken ? (
                          <p className="mt-1 text-xs text-theme-muted">Action: {inc.actionTaken}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-muted">{inc.recordedByName || '—'}</td>
                      <td className="px-4 py-3 text-sm text-theme-muted max-w-[10rem]">
                        {inc.headTeacherRemarks || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {!flaggedOnly ? (
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
    </div>
  );
}

export default function DisciplineRegistryPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-6 h-96 max-w-7xl rounded-2xl" />}>
      <DisciplineRegistryContent />
    </Suspense>
  );
}
