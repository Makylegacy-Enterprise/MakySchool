'use client';

import type { AttendanceRiskLevel } from '@makyschool/shared';

const RISK_STYLES: { [K in AttendanceRiskLevel]: string } = {
  ok: 'badge-success',
  watch: 'badge-warning',
  at_risk: 'bg-theme-warning-bg text-theme-warning border border-theme',
  critical: 'badge-danger',
};

const RISK_LABELS: { [K in AttendanceRiskLevel]: string } = {
  ok: 'On track',
  watch: 'Watch',
  at_risk: 'At risk',
  critical: 'Critical',
};

export function AttendanceRiskBadge({ level }: { level: AttendanceRiskLevel }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${RISK_STYLES[level]}`}>
      {RISK_LABELS[level]}
    </span>
  );
}

export function formatAttendanceDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
