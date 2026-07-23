'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Plus } from 'lucide-react';
import { EmptyState } from '@makyschool/ui/components/ui/EmptyState';
import { Skeleton } from '@makyschool/ui/components/ui/Skeleton';
import { Modal } from '@makyschool/ui/components/ui/Modal';
import { useToast } from '@/providers/ToastProvider';
import {
  useStudentDiscipline,
  useAddDisciplineRemarks,
} from '@/hooks/useDiscipline';
import { useCurrentTerm } from '@/hooks/useCurrentTerm';
import { LogDisciplineIncidentPanel } from '@/components/discipline/LogDisciplineIncidentPanel';
import type { DisciplineIncident, DisciplineIncidentType } from '@makyschool/shared';
import { CanDo } from '@/components/ui/CanDo';

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

export function StudentDisciplinePanel({
  studentId,
  studentName,
  classId,
  canLog = true,
}: {
  studentId: string;
  studentName?: string;
  classId?: string | null;
  canLog?: boolean;
}) {
  const { data: term } = useCurrentTerm();
  const termId = term?.id ?? '';
  const { data, isPending, isError, error, refetch } = useStudentDiscipline(
    studentId,
    termId,
    !!studentId,
  );
  const [logOpen, setLogOpen] = useState(false);
  const [remarksFor, setRemarksFor] = useState<DisciplineIncident | null>(null);

  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        variant="error"
        title="Couldn’t load discipline records"
        description={error instanceof Error ? error.message : 'Please try again.'}
        onRetry={() => void refetch()}
      />
    );
  }

  const { summary, incidents } = data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-theme-primary">Discipline</h2>
          <p className="text-xs text-theme-muted">
            {term?.name ? `${term.name} · ` : ''}Incident history for this learner
          </p>
        </div>
        {canLog && (
          <button
            type="button"
            className="ms-btn-primary inline-flex items-center gap-2"
            onClick={() => setLogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Log incident
          </button>
        )}
      </div>

      {summary.flagged && (
        <div className="flex items-start gap-3 rounded-xl border border-theme bg-theme-danger-bg px-4 py-3 text-sm text-theme-danger">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Repeat major offences</p>
            <p className="text-theme-danger/90">
              {summary.major} major incidents this term (threshold: {summary.threshold}).
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Stat label="Major" value={summary.major} tone="danger" />
        <Stat label="Minor" value={summary.minor} tone="warning" />
        <Stat label="Commendation" value={summary.commendation} tone="success" />
        <Stat label="Total" value={summary.total} />
      </div>

      {incidents.length === 0 ? (
        <EmptyState
          title="No incidents yet"
          description="Discipline and commendation records for this student will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-theme bg-theme-surface">
          <div className="overflow-x-auto">
            <table className="ms-table w-full min-w-[44rem]">
              <thead className="bg-table-header text-xs font-medium uppercase tracking-wide text-theme-muted">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Remarks</th>
                  <th className="px-4 py-3 text-right"> </th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => (
                  <tr key={inc.id} className="border-t border-theme align-top">
                    <td className="px-4 py-3 text-sm whitespace-nowrap text-theme-primary">
                      {formatDate(inc.incidentDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${TYPE_BADGE[inc.incidentType]}`}>
                        {inc.incidentType}
                      </span>
                      {inc.category ? (
                        <p className="mt-1 text-xs text-theme-muted">{inc.category}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-theme-primary max-w-xs">
                      <p>{inc.description}</p>
                      <p className="mt-1 text-xs text-theme-muted">
                        by {inc.recordedByName || 'Staff'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-theme-muted">
                      {inc.actionTaken || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-theme-muted max-w-[12rem]">
                      {inc.headTeacherRemarks || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CanDo action="viewAllClasses">
                        <button
                          type="button"
                          className="text-xs font-semibold text-theme-accent hover:underline"
                          onClick={() => setRemarksFor(inc)}
                        >
                          {inc.headTeacherRemarks ? 'Edit remarks' : 'Add remarks'}
                        </button>
                      </CanDo>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <LogDisciplineIncidentPanel
        open={logOpen}
        onClose={() => setLogOpen(false)}
        studentId={studentId}
        studentName={studentName || 'Student'}
        classId={classId}
      />

      {remarksFor && (
        <RemarksModal
          incident={remarksFor}
          onClose={() => setRemarksFor(null)}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'danger' | 'warning' | 'success';
}) {
  const toneClass =
    tone === 'danger'
      ? 'text-theme-danger'
      : tone === 'warning'
        ? 'text-theme-warning'
        : tone === 'success'
          ? 'text-theme-success'
          : 'text-theme-primary';
  return (
    <div className="rounded-xl border border-theme bg-theme-surface p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-theme-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

function RemarksModal({
  incident,
  onClose,
}: {
  incident: DisciplineIncident;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const addRemarks = useAddDisciplineRemarks();
  const [remarks, setRemarks] = useState(incident.headTeacherRemarks || '');
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    try {
      await addRemarks.mutateAsync({ incidentId: incident.id, remarks: remarks.trim() });
      toast.success('Remarks saved.');
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save remarks.';
      setError(msg);
      toast.error(msg);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Head teacher remarks"
      description={`${incident.studentName} · ${formatDate(incident.incidentDate)}`}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="ms-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ms-btn-primary"
            disabled={addRemarks.isPending || remarks.trim().length < 2}
            onClick={() => void save()}
          >
            {addRemarks.isPending ? 'Saving…' : 'Save remarks'}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {error ? <StatusBannerError message={error} /> : null}
        <p className="text-sm text-theme-muted line-clamp-3">{incident.description}</p>
        <textarea
          className="ms-input w-full"
          rows={4}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Decision, counselling notes, follow-up…"
        />
      </div>
    </Modal>
  );
}

function StatusBannerError({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-theme-danger-bg px-3 py-2 text-sm text-theme-danger">{message}</div>
  );
}

/** Link helper used by dashboard flag */
export function DisciplineFlagLink({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Link
      href="/dashboard/discipline?flagged=1"
      className="ms-card flex w-56 shrink-0 flex-col p-5 border-theme-danger/30 hover:border-theme-accent"
    >
      <p className="text-xs text-theme-muted">Discipline alerts</p>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-theme-danger">{count}</p>
      <p className="mt-1 text-xs text-theme-muted">students with 3+ major offences</p>
    </Link>
  );
}
