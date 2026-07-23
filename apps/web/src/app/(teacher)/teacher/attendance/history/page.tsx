'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Users } from 'lucide-react';
import { useMonthlyAttendance } from '@/hooks/useAttendance';
import type { AttendanceStatus } from '@makyschool/shared';

import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { useCurrentTerm } from '@/hooks/useCurrentTerm';

const DOT: { [K in AttendanceStatus]: string } = {
  present: 'bg-emerald-500 dark:bg-emerald-400',
  late:    'bg-amber-400 dark:bg-amber-400',
  absent:  'bg-rose-500 dark:bg-rose-400',
};

function currentMonth() {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'Africa/Kampala',
  }).slice(0, 7);
}

export default function AttendanceHistoryPage() {
  const pathname = usePathname();
  const { data: classes = [] } = useTeacherClasses();
  const { data: term }         = useCurrentTerm();

  const [selectedClassId, setSelectedClassId] = useState('');
  const [month, setMonth]                     = useState(currentMonth());

  const classId = selectedClassId || classes[0]?.id || '';
  const termId  = term?.id ?? '';

  const { data, isPending, isError } = useMonthlyAttendance(
    classId, termId, month, !!classId && !!termId
  );

  const days   = data?.schoolDays ?? [];
  const rows   = data?.rows ?? [];
  const dayNums = days.map((d) => ({ full: d, day: new Date(d).getDate() }));

  const columnTotals = useMemo(() => {
    const totals: { [key: string]: { present: number; late: number; absent: number } } = {};
    for (const day of days) {
      totals[day] = { present: 0, late: 0, absent: 0 };
    }
    for (const row of rows) {
      for (const day of days) {
        const status = row.days[day] as AttendanceStatus | undefined;
        if (status) totals[day][status]++;
      }
    }
    return totals;
  }, [days, rows]);

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Attendance</h1>
            <p className="text-xs text-muted-foreground">Monthly history for your assigned classes</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href="/teacher/attendance"
            className={[
              'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
              pathname === '/teacher/attendance'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            ].join(' ')}
          >
            Take Attendance
          </Link>
          <Link
            href="/teacher/attendance/history"
            className={[
              'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
              pathname === '/teacher/attendance/history'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            ].join(' ')}
          >
            Attendance History
          </Link>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-12 text-center max-w-md mx-auto mt-8 bg-muted/10 shadow-sm">
          <Users className="h-10 w-10 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold text-foreground">No Assigned Classes</h3>
          <p className="text-sm text-muted-foreground">
            You do not have any classes assigned to you in the system.
          </p>
          <p className="text-xs text-muted-foreground/60">
            Please contact your school administrator to configure your teaching load.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-6 bg-muted/30 p-4 rounded-xl border border-border/60">
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class</label>
              <select
                className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm shadow-sm transition-all duration-200 hover:border-muted-foreground/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer text-foreground"
                value={classId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.level} {c.stream}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Month</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm shadow-sm transition-all duration-200 hover:border-muted-foreground/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer text-foreground"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-5 text-xs text-muted-foreground bg-muted/10 p-3 rounded-lg border border-border/40 w-fit">
            {(Object.entries(DOT) as [AttendanceStatus, string][]).map(([s, cls]) => (
              <span key={s} className="flex items-center gap-2 capitalize font-medium">
                <span className={`h-3 w-3 rounded-full shadow-sm ${cls}`} />
                {s}
              </span>
            ))}
            <span className="flex items-center gap-2 font-medium">
              <span className="h-3 w-3 rounded-full bg-muted-foreground/20 border border-border" />
              Not recorded
            </span>
          </div>

          {isPending ? (
            <div className="h-64 animate-pulse rounded-xl bg-muted/50 border border-border" />
          ) : isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/10 p-6 text-center text-sm text-rose-700 dark:text-rose-400 font-medium shadow-sm">
              Failed to load history.
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-12 text-center max-w-md mx-auto mt-8 bg-background shadow-sm">
              <CalendarDays className="h-10 w-10 text-muted-foreground/30" />
              <h3 className="text-base font-semibold text-foreground">No Records Found</h3>
              <p className="text-xs text-muted-foreground">
                No attendance records exist for this class in the selected month.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-theme bg-theme-surface">
              <div className="overflow-x-auto">
                <table className="ms-table w-full text-xs">
                  <thead className="bg-table-header">
                    <tr>
                      <th className="sticky left-0 z-20 bg-table-header border-r border-theme px-5 py-3.5 text-left font-semibold text-theme-muted">
                        Student
                      </th>
                      {dayNums.map(({ full, day }) => (
                        <th
                          key={full}
                          className="min-w-[2.5rem] px-2 py-3.5 text-center font-semibold text-muted-foreground border-b border-border"
                          title={full}
                        >
                          {day}
                        </th>
                      ))}
                      <th className="px-5 py-3.5 text-center font-semibold text-muted-foreground border-b border-border w-24">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row) => (
                      <tr key={row.studentId} className="group bg-background hover:bg-muted/10 transition-colors duration-150">
                        <td className="sticky left-0 z-10 bg-background group-hover:bg-muted/20 dark:group-hover:bg-zinc-800 transition-colors duration-150 border-r border-border/80 px-5 py-3 font-semibold text-foreground shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          <div className="text-sm">{row.studentName}</div>
                          <div className="font-mono text-[10px] text-muted-foreground/80 font-normal mt-0.5">
                            {row.learnerId}
                          </div>
                        </td>
                        {dayNums.map(({ full }) => {
                          const status = row.days[full] as AttendanceStatus | undefined;
                          return (
                            <td key={full} className="px-2 py-3 text-center">
                              {status ? (
                                <span
                                  className={`mx-auto block h-3 w-3 rounded-full shadow-sm hover:scale-110 transition-transform cursor-help ${DOT[status]}`}
                                  title={`${row.studentName} was ${status} on ${full}`}
                                />
                              ) : (
                                <span className="mx-auto block h-3 w-3 rounded-full bg-muted-foreground/15 border border-border/40" />
                              )}
                            </td>
                          );
                        })}
                        <td className="px-5 py-3 text-center font-bold text-foreground">
                          {row.daysAttended}
                          <span className="text-muted-foreground/60 font-normal">/{row.totalDays}</span>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted/30 border-t-2 border-border">
                      <td className="sticky left-0 z-10 bg-muted/95 dark:bg-zinc-900 border-r border-border/80 px-5 py-3 font-semibold text-foreground text-xs uppercase tracking-wider">
                        Column totals
                      </td>
                      {dayNums.map(({ full }) => {
                        const t = columnTotals[full];
                        return (
                          <td key={full} className="px-1 py-2 text-center align-top">
                            <div className="flex flex-col items-center gap-0.5 text-[9px] font-medium leading-tight">
                              <span className="text-emerald-600 dark:text-emerald-400">{t?.present ?? 0}P</span>
                              <span className="text-amber-600 dark:text-amber-400">{t?.late ?? 0}L</span>
                              <span className="text-rose-600 dark:text-rose-400">{t?.absent ?? 0}A</span>
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-5 py-3 text-center text-muted-foreground">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
