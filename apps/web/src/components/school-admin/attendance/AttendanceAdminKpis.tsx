'use client';

import type { AttendanceAdminKpis as AttendanceAdminKpisData } from '@makyschool/shared';
import {
  Users,
  School,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  ClipboardCheck,
  AlertTriangle,
  Percent,
} from 'lucide-react';

type KpiItem = {
  label: string;
  value: string | number;
  icon: React.ElementType;
  valueClassName?: string;
};

export function AttendanceAdminKpis({ kpis }: { kpis: AttendanceAdminKpisData }) {
  const items: KpiItem[] = [
    {
      label: 'Active students',
      value: kpis.activeStudents,
      icon: Users,
    },
    {
      label: 'Classes',
      value: kpis.classCount,
      icon: School,
    },
    {
      label: 'School days',
      value: kpis.schoolDays,
      icon: CalendarDays,
    },
    {
      label: 'Avg attendance',
      value: `${kpis.averageAttendanceRate}%`,
      icon: Percent,
      valueClassName:
        kpis.averageAttendanceRate >= 90
          ? 'text-emerald-600 dark:text-emerald-400'
          : kpis.averageAttendanceRate >= 75
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-rose-600 dark:text-rose-400',
    },
    {
      label: 'Present marks',
      value: kpis.present,
      icon: CheckCircle2,
      valueClassName: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Late marks',
      value: kpis.late,
      icon: Clock,
      valueClassName: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Absent marks',
      value: kpis.absent,
      icon: XCircle,
      valueClassName: 'text-rose-600 dark:text-rose-400',
    },
    {
      label: 'Registers submitted',
      value: kpis.registersSubmitted,
      icon: ClipboardCheck,
    },
    {
      label: 'Registers missing',
      value: kpis.registersMissing,
      icon: AlertTriangle,
      valueClassName:
        kpis.registersMissing > 0
          ? 'text-amber-600 dark:text-amber-400'
          : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-border bg-background p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <item.icon className="h-3.5 w-3.5 shrink-0" />
            {item.label}
          </div>
          <div
            className={[
              'mt-2 text-2xl font-bold tabular-nums',
              item.valueClassName ?? 'text-foreground',
            ].join(' ')}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AttendanceAdminKpisSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-background p-4 shadow-sm">
          <div className="h-3 w-20 animate-pulse rounded bg-muted/60" />
          <div className="mt-3 h-7 w-14 animate-pulse rounded bg-muted/80" />
        </div>
      ))}
    </div>
  );
}
