'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  Search,
  Loader2,
  AlertCircle,
  Inbox,
  BarChart3,
  ClipboardList,
} from 'lucide-react';
import { useDailyAttendanceByClass, useAttendanceAdminOverview } from '@/hooks/useAttendance';
import { todayEAT } from '@/lib/api/attendance';
import type { AttendanceStatus } from '@makyschool/shared';
import { useCurrentTerm } from '@/hooks/useCurrentTerm';
import {
  AttendanceAdminKpis,
  AttendanceAdminKpisSkeleton,
} from '@/components/school-admin/attendance/AttendanceAdminKpis';
import {
  AttendanceAdminCharts,
  AttendanceAdminChartsSkeleton,
} from '@/components/school-admin/attendance/AttendanceAdminCharts';

type StatusConfig = {
  label: string;
  icon: React.ElementType;
  bg: string;
  border: string;
  text: string;
};

const STATUS_CONFIG: { [K in AttendanceStatus]: StatusConfig } = {
  present: {
    label:  'Present',
    icon:   CheckCircle2,
    bg:     'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-500/50 dark:border-emerald-500/30',
    text:   'text-emerald-700 dark:text-emerald-400',
  },
  late: {
    label:  'Late',
    icon:   Clock,
    bg:     'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-500/50 dark:border-amber-500/30',
    text:   'text-amber-700 dark:text-amber-400',
  },
  absent: {
    label:  'Absent',
    icon:   XCircle,
    bg:     'bg-rose-50 dark:bg-rose-950/30',
    border: 'border-rose-500/50 dark:border-rose-500/30',
    text:   'text-rose-700 dark:text-rose-400',
  },
};

interface SchoolClassStream {
  id: string;
  level: string;
  stream: string;
}

type TabId = 'daily' | 'analytics';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function SchoolAdminAttendancePage() {
  const { data: term } = useCurrentTerm();
  const [activeTab, setActiveTab] = useState<TabId>('daily');

  const [selectedDate, setSelectedDate] = useState(todayEAT());
  const [selectedClassId, setSelectedClassId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [classes, setClasses] = useState<SchoolClassStream[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [classesError, setClassesError] = useState(false);

  const [analyticsClassId, setAnalyticsClassId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState(todayEAT());

  useEffect(() => {
    let cancelled = false;
    async function fetchStreams() {
      setIsLoadingClasses(true);
      setClassesError(false);
      try {
        const res = await fetch('/api/schools/classes');
        if (!res.ok) throw new Error(`Request failed with ${res.status}`);
        const payload = await res.json();
        if (cancelled) return;
        if (payload?.data) {
          setClasses(payload.data);
          if (payload.data.length > 0) {
            setSelectedClassId((prev) => prev || payload.data[0].id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed fetching administrative stream records', err);
          setClassesError(true);
        }
      } finally {
        if (!cancelled) setIsLoadingClasses(false);
      }
    }
    fetchStreams();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (term?.startDate) {
      setDateFrom((prev) => prev || term.startDate!);
    } else if (!dateFrom) {
      const d = new Date();
      d.setDate(1);
      setDateFrom(d.toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' }));
    }
  }, [term?.startDate, dateFrom]);

  const termId = term?.id ?? '';
  const queryEnabled = !!selectedClassId && !!termId;

  const { data, isPending: isPendingAttendance, isError } = useDailyAttendanceByClass(
    selectedClassId,
    termId,
    selectedDate,
    queryEnabled && activeTab === 'daily',
  );

  const analyticsEnabled =
    activeTab === 'analytics' && !!termId && !!dateFrom && !!dateTo;

  const {
    data: overview,
    isPending: isPendingOverview,
    isError: isOverviewError,
  } = useAttendanceAdminOverview(
    termId,
    dateFrom,
    dateTo,
    analyticsClassId,
    analyticsEnabled,
  );

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const isPending = isLoadingClasses || (queryEnabled && isPendingAttendance);

  const stats = useMemo(() => {
    if (!data?.students) return { total: 0, present: 0, late: 0, absent: 0, unmarked: 0, rate: 0 };
    const totals = { total: data.students.length, present: 0, late: 0, absent: 0, unmarked: 0 };

    data.students.forEach((s) => {
      if (s.status === 'present') totals.present++;
      else if (s.status === 'late') totals.late++;
      else if (s.status === 'absent') totals.absent++;
      else totals.unmarked++;
    });

    const attended = totals.present + totals.late;
    const rate = totals.total > 0 ? Math.round((attended / totals.total) * 100) : 0;
    return { ...totals, rate };
  }, [data]);

  const filteredStudents = useMemo(() => {
    if (!data?.students) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return data.students;
    return data.students.filter((s) =>
      s.studentName.toLowerCase().includes(q) || s.learnerId.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
            <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              School Attendance Registry
            </h1>
            <p className="text-xs text-muted-foreground">
              Review daily attendance and school-wide trends across every class stream.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={[
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
              activeTab === 'daily'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            ].join(' ')}
          >
            <ClipboardList className="h-4 w-4" />
            Daily Register
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={[
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
              activeTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            ].join(' ')}
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </button>
        </div>
      </div>

      {activeTab === 'analytics' ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 bg-muted/30 p-4 rounded-xl border border-border/60 sm:items-end">
            <div className="flex flex-col gap-1.5 sm:min-w-[160px]">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                From
              </label>
              <input
                type="date"
                max={dateTo || todayEAT()}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:min-w-[160px]">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                To
              </label>
              <input
                type="date"
                max={todayEAT()}
                min={dateFrom}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:min-w-[220px]">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Class filter
              </label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground cursor-pointer"
                value={analyticsClassId}
                onChange={(e) => setAnalyticsClassId(e.target.value)}
              >
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.level} — {c.stream}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!termId ? (
            <EmptyState
              icon={CalendarDays}
              title="No current term"
              body="Set the current academic term before viewing attendance analytics."
            />
          ) : isPendingOverview && !overview ? (
            <div className="space-y-6">
              <AttendanceAdminKpisSkeleton />
              <AttendanceAdminChartsSkeleton />
            </div>
          ) : isOverviewError ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/10 p-8 text-center text-sm text-rose-700 dark:text-rose-400 font-medium shadow-sm">
              <AlertCircle className="h-6 w-6" />
              Couldn&apos;t load attendance analytics. Try again.
            </div>
          ) : overview ? (
            <div className="space-y-6">
              <AttendanceAdminKpis kpis={overview.kpis} />
              <AttendanceAdminCharts data={overview} />
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 bg-muted/30 p-4 rounded-xl border border-border/60 sm:items-end">
            <div className="flex flex-col gap-1.5 sm:min-w-[170px]">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Date
              </label>
              <input
                type="date"
                max={todayEAT()}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:min-w-[220px]">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Class Stream
              </label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground cursor-pointer disabled:opacity-50"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                disabled={classes.length === 0 || isLoadingClasses}
              >
                {isLoadingClasses ? (
                  <option>Loading class list…</option>
                ) : classesError ? (
                  <option value="">Couldn&apos;t load classes</option>
                ) : classes.length === 0 ? (
                  <option value="">No classes configured</option>
                ) : (
                  classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.level} — {c.stream}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 flex-1 sm:min-w-[260px]">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Search Student
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                <input
                  type="text"
                  placeholder="Search by name or learner ID…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                />
              </div>
            </div>
          </div>

          {classesError && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/10 px-5 py-3 text-sm font-medium text-rose-700 dark:text-rose-400 shadow-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Couldn&apos;t load the list of class streams. Refresh to try again.
            </div>
          )}

          {data && !isPending && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <StatCard
                label="Presence Rate"
                value={`${stats.rate}%`}
                valueClassName={stats.rate >= 90 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}
              />
              <StatCard label="Total Students" value={stats.total} />
              <StatCard label="Present" value={stats.present} valueClassName="text-emerald-600 dark:text-emerald-400" />
              <StatCard label="Late" value={stats.late} valueClassName="text-amber-500" />
              <StatCard label="Absent" value={stats.absent} valueClassName="text-rose-500" />
            </div>
          )}

          {classes.length === 0 && !isLoadingClasses && !classesError ? (
            <EmptyState
              icon={Inbox}
              title="No Class Streams Configured"
              body="Set up class streams under School Setup before attendance can be reviewed here."
            />
          ) : isPending ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-background p-14 shadow-sm">
              <Loader2 className="h-7 w-7 text-indigo-500 animate-spin" />
              <p className="text-sm text-muted-foreground">Loading attendance records…</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/10 p-8 text-center text-sm text-rose-700 dark:text-rose-400 font-medium shadow-sm">
              <AlertCircle className="h-6 w-6" />
              Couldn&apos;t load attendance for this class. Check your connection and try again.
            </div>
          ) : !data?.alreadySubmitted ? (
            <EmptyState
              icon={CalendarDays}
              title="Attendance Not Yet Submitted"
              body={`No teacher has submitted attendance for ${selectedClass ? `${selectedClass.level} ${selectedClass.stream}` : 'this class'} on ${new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`}
            />
          ) : filteredStudents.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No Matching Students"
              body="Try a different name or learner ID."
            />
          ) : (
            <>
              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3.5">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-foreground">Attendance breakdown</span>
                  <span className="text-muted-foreground">
                    {stats.present + stats.late} of {stats.total} attended
                  </span>
                </div>
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                  {stats.total > 0 && (
                    <>
                      <div className="bg-emerald-500" style={{ width: `${(stats.present / stats.total) * 100}%` }} />
                      <div className="bg-amber-500" style={{ width: `${(stats.late / stats.total) * 100}%` }} />
                      <div className="bg-rose-500" style={{ width: `${(stats.absent / stats.total) * 100}%` }} />
                    </>
                  )}
                </div>
              </div>

              <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-background shadow-sm">
                <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3.5 w-16">#</th>
                        <th className="px-5 py-3.5">Student</th>
                        <th className="px-5 py-3.5 w-40">Learner ID</th>
                        <th className="px-5 py-3.5 w-40">Status</th>
                        <th className="px-5 py-3.5">Teacher Comments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredStudents.map((student, idx) => (
                        <tr key={student.studentId} className="bg-background hover:bg-muted/10 transition-colors">
                          <td className="px-5 py-4 text-muted-foreground font-medium">{idx + 1}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                {initials(student.studentName)}
                              </span>
                              <span className="font-semibold text-foreground">{student.studentName}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 font-mono text-xs text-muted-foreground/80">{student.learnerId}</td>
                          <td className="px-5 py-4">
                            {student.status ? (
                              <span
                                className={[
                                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold',
                                  STATUS_CONFIG[student.status].bg,
                                  STATUS_CONFIG[student.status].border,
                                  STATUS_CONFIG[student.status].text,
                                ].join(' ')}
                              >
                                {STATUS_CONFIG[student.status].label}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">— not marked</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-muted-foreground text-xs italic">
                            {student.notes || <span className="text-muted-foreground/40">No remarks</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="md:hidden space-y-2.5">
                {filteredStudents.map((student, idx) => (
                  <div key={student.studentId} className="rounded-xl border border-border bg-background p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {initials(student.studentName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">{idx + 1}. {student.studentName}</p>
                        <p className="font-mono text-[11px] text-muted-foreground/80">{student.learnerId}</p>
                      </div>
                      {student.status ? (
                        <span
                          className={[
                            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold shrink-0',
                            STATUS_CONFIG[student.status].bg,
                            STATUS_CONFIG[student.status].border,
                            STATUS_CONFIG[student.status].text,
                          ].join(' ')}
                        >
                          {STATUS_CONFIG[student.status].label}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs shrink-0">—</span>
                      )}
                    </div>
                    {student.notes && (
                      <p className="text-xs text-muted-foreground italic pl-12">{student.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  valueClassName = 'text-foreground',
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div className="bg-background border border-border rounded-xl p-4 shadow-sm">
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${valueClassName}`}>{value}</div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-12 text-center bg-muted/10 shadow-sm">
      <Icon className="h-10 w-10 text-muted-foreground/30" />
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{body}</p>
    </div>
  );
}
