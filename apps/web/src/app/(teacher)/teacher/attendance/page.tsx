'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { CalendarDays, CheckCircle2, Clock, XCircle, Users } from 'lucide-react';
import { useDailyAttendance, useSaveAttendance, useTeacherTimetable } from '@/hooks/useAttendance';
import { todayEAT } from '@/lib/api/attendance';
import type { AttendanceStatus, BulkAttendanceEntry } from '@makyschool/shared';
import { useCurrentTerm } from '@/hooks/useCurrentTerm';

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

const STATUS_KEYS = ['present', 'late', 'absent'] as AttendanceStatus[];

export default function AttendancePage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: term } = useCurrentTerm();

  // Read initialization parameters directly off the browser navigation query bar
  const urlDate = searchParams.get('date');
  const urlSlotId = searchParams.get('slotId');

  const [selectedDate, setSelectedDate] = useState(urlDate || todayEAT());
  const [selectedSlotId, setSelectedSlotId] = useState(urlSlotId || '');
  const [overrides, setOverrides] = useState<{ [id: string]: AttendanceStatus }>({});
  const [notes, setNotes] = useState<{ [id: string]: string }>({});
  const [isEditing, setIsEditing] = useState(false);

  const termId = term?.id ?? '';

  // 1. Fetch available timetable period blocks assigned to this teacher for the selected date
  const { data: slots = [], isPending: isPendingSlots } = useTeacherTimetable(selectedDate);

  // If a deep-linked slotId is in the URL, prioritize it. Otherwise, fall back to the first available slot.
  const activeSlotId = selectedSlotId || slots[0]?.timetableSlotId || '';
  const queryEnabled = !!activeSlotId && !!termId;

  // Sync state if navigation URL parameters change externally
  useEffect(() => {
    if (urlDate) setSelectedDate(urlDate);
    if (urlSlotId) setSelectedSlotId(urlSlotId);
  }, [urlDate, urlSlotId]);

  // 2. Fetch the roster and logs driven by the selected timetable period ID
  const { data, isPending: isPendingAttendance, isError } = useDailyAttendance(
    activeSlotId,
    termId,
    selectedDate,
    queryEnabled
  );
  
  const saveMutation = useSaveAttendance();

  // Reset local form states when switching periods or shifting dates
  useEffect(() => {
    setOverrides({});
    setNotes({});
    setIsEditing(false);
  }, [activeSlotId, selectedDate]);

  const alreadySubmitted = data?.alreadySubmitted && !isEditing;
  const isInitialTake = data && !data.alreadySubmitted;

  const rows = useMemo(() => {
    if (!data) return [];
    return data.students.map((s) => ({
      ...s,
      status: overrides[s.studentId] ?? s.status ?? (isInitialTake ? 'present' : null),
      notes:  notes[s.studentId] ?? s.notes ?? '',
    }));
  }, [data, overrides, notes, isInitialTake]);

  function setStatus(studentId: string, st: AttendanceStatus) {
    setOverrides((prev) => ({ ...prev, [studentId]: st }));
  }

  function setNote(studentId: string, note: string) {
    setNotes((prev) => ({ ...prev, [studentId]: note }));
  }

  function markAllPresent() {
    const next: { [id: string]: AttendanceStatus } = {};
    rows.forEach((r) => { next[r.studentId] = 'present'; });
    setOverrides(next);
  }

  async function handleSave() {
    const entries: BulkAttendanceEntry[] = rows.map((r) => ({
      studentId: r.studentId,
      status:    r.status ?? 'present',
      notes:     notes[r.studentId] || undefined,
    }));
    
    await saveMutation.mutateAsync({ timetableSlotId: activeSlotId, termId, date: selectedDate, entries });
    setOverrides({});
    setNotes({});
    setIsEditing(false);
  }

  const hasChanges = Object.keys(overrides).length > 0;
  const canSave = isInitialTake ? true : hasChanges;
  const isPending = isPendingSlots || isPendingAttendance;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-primary animate-pulse" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Attendance</h1>
        </div>

        {/* Tab Navigation */}
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

      {/* Controls Container */}
      <div className="flex flex-wrap gap-6 bg-muted/30 p-4 rounded-xl border border-border/60">
        <div className="flex flex-col gap-1.5 min-w-[160px]">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</label>
          <input
            type="date"
            max={todayEAT()}
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedSlotId(''); 
            }}
            className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm shadow-sm transition-all duration-200 hover:border-muted-foreground/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer text-foreground"
          />
        </div>

        <div className="flex flex-col gap-1.5 min-w-[280px] flex-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assigned Period / Lesson</label>
          <select
            className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm shadow-sm transition-all duration-200 hover:border-muted-foreground/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer text-foreground disabled:opacity-50"
            value={activeSlotId}
            onChange={(e) => setSelectedSlotId(e.target.value)}
            disabled={slots.length === 0}
          >
            {slots.length === 0 ? (
              <option value="">No classes or periods assigned on this day</option>
            ) : (
              slots.map((s) => (
                <option key={s.timetableSlotId} value={s.timetableSlotId}>
                  {s.className} — {s.subjectName} {s.timeLabel} {s.alreadySubmitted ? '✓' : ''}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {slots.length === 0 && !isPending ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-12 text-center max-w-md mx-auto mt-8 bg-muted/10 shadow-sm">
          <Users className="h-10 w-10 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold text-foreground">No Timetable Periods</h3>
          <p className="text-sm text-muted-foreground">
            You are not scheduled to teach any classes on this specific weekday.
          </p>
          <p className="text-xs text-muted-foreground/60">
            Select another date or verify assignments with your school administrator.
          </p>
        </div>
      ) : (
        <>
          {/* Already submitted banner */}
          {alreadySubmitted && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/10 px-5 py-3.5 shadow-sm">
              <div className="flex items-center gap-2.5 text-sm text-emerald-800 dark:text-emerald-300 font-medium">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Attendance already submitted for this period slot.
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors underline underline-offset-4"
              >
                Edit Attendance
              </button>
            </div>
          )}

          {/* Table View State Grid */}
          {isPending ? (
            <AttendanceTableSkeleton />
          ) : isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/10 p-6 text-center text-sm text-rose-700 dark:text-rose-400 font-medium shadow-sm">
              Failed to load students for this period. Please try again.
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-12 text-center bg-background shadow-sm">
              <Users className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-semibold text-foreground">No students found in this class</p>
              <p className="text-xs text-muted-foreground">
                Ensure active students are added to this class section.
              </p>
            </div>
          ) : (
            <>
              {!alreadySubmitted && (
                <div className="flex justify-end">
                  <button
                    onClick={markAllPresent}
                    className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors underline underline-offset-4"
                  >
                    Mark all present
                  </button>
                </div>
              )}

              <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3.5 w-16">#</th>
                        <th className="px-5 py-3.5">Student</th>
                        <th className="px-5 py-3.5 w-32">ID</th>
                        <th className="px-5 py-3.5 w-72">Status</th>
                        <th className="px-5 py-3.5 min-w-[200px]">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((student, idx) => (
                        <tr key={student.studentId} className="bg-background hover:bg-muted/10 transition-colors duration-150">
                          <td className="px-5 py-4 text-muted-foreground font-medium">{idx + 1}</td>
                          <td className="px-5 py-4 font-semibold text-foreground">{student.studentName}</td>
                          <td className="px-5 py-4 font-mono text-xs text-muted-foreground/80">
                            {student.learnerId}
                          </td>
                          <td className="px-5 py-4">
                            {alreadySubmitted ? (
                              <StatusBadge status={student.status as AttendanceStatus} />
                            ) : (
                              <div className="flex gap-1.5">
                                {STATUS_KEYS.map((s) => {
                                  const cfg = STATUS_CONFIG[s];
                                  const active = student.status === s;
                                  return (
                                    <button
                                      key={s}
                                      onClick={() => setStatus(student.studentId, s)}
                                      className={[
                                        'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 shadow-sm',
                                        active
                                          ? `${cfg.bg} ${cfg.border} ${cfg.text} ring-1 ring-inset ring-current/10`
                                          : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                                      ].join(' ')}
                                    >
                                      <cfg.icon className="h-3.5 w-3.5" />
                                      {cfg.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {alreadySubmitted ? (
                              <span className="text-muted-foreground italic text-xs">{student.notes || '—'}</span>
                            ) : (
                              <input
                                type="text"
                                placeholder="Optional note…"
                                value={notes[student.studentId] ?? student.notes ?? ''}
                                onChange={(e) => setNote(student.studentId, e.target.value)}
                                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs placeholder:text-muted-foreground/45 transition-colors focus:border-primary focus:outline-none text-foreground"
                              />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {!alreadySubmitted && (
                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSave}
                    disabled={saveMutation.isPending || !canSave}
                    className="flex items-center gap-2.5 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/10 transition-all duration-200 hover:bg-primary/95 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {saveMutation.isPending && (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    )}
                    Save Attendance
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: AttendanceStatus | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        cfg.bg, cfg.border, cfg.text,
      ].join(' ')}
    >
      <cfg.icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function AttendanceTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="bg-muted/50 px-4 py-3 h-10" />
      <div className="divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="h-4 w-6 animate-pulse rounded bg-muted/60" />
              <div className="space-y-1.5">
                <div className="h-4 w-36 animate-pulse rounded bg-muted/80" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted/40" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-24 animate-pulse rounded-lg bg-muted/50" />
              <div className="h-8 w-24 animate-pulse rounded-lg bg-muted/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}