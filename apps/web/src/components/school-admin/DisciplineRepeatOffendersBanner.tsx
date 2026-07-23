'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { useRepeatOffenders } from '@/hooks/useDiscipline';
import { useCurrentTerm } from '@/hooks/useCurrentTerm';

export function DisciplineRepeatOffendersBanner() {
  const { data: term } = useCurrentTerm();
  const { data, isPending } = useRepeatOffenders(term?.id ?? '', !!term?.id);

  if (isPending || !data || data.students.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-theme bg-theme-danger-bg/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-theme-danger" />
        <div>
          <p className="text-sm font-semibold text-theme-danger">
            {data.students.length} student{data.students.length === 1 ? '' : 's'} with{' '}
            {data.threshold}+ major offences this term
          </p>
          <p className="mt-1 text-xs text-theme-muted">
            {data.students
              .slice(0, 3)
              .map((s) => `${s.studentName} (${s.majorCount})`)
              .join(' · ')}
            {data.students.length > 3 ? ` · +${data.students.length - 3} more` : ''}
          </p>
        </div>
      </div>
      <Link href="/dashboard/discipline?flagged=1" className="ms-btn-secondary shrink-0 text-sm">
        Review discipline
      </Link>
    </div>
  );
}
