'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  AlertCircle,
  Lock,
  ChevronDown,
} from 'lucide-react';
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
  dot: string;
};

const STATUS_CONFIG: { [K in AttendanceStatus]: StatusConfig } = {
  present: {
    label:  'Present',
    icon:   CheckCircle2,
    bg:     'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-500/50 dark:border-emerald-500/30',
    text:   'text-emerald-700 dark:text-emerald-400',
    dot:    'bg-emerald-500',
  },
  late: {
    label:  'Late',
    icon:   Clock,
    bg:     'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-500/50 dark:border-amber-500/30',
    text:   'text-amber-700 dark:text-amber-400',
    dot:    'bg-amber-500',
  },
  absent: {
    label:  'Absent',
    icon:   XCircle,
    bg:     'bg-rose-50 dark:bg-rose-950/30',
    border: 'border-rose-500/50 dark:border-rose-500/30',
    text:   'text-rose-700 dark:text-rose-400',
    dot:    'bg-rose-500',
  },
};

const STATUS_KEYS = ['present', 'late', 'absent'] as AttendanceStatus[];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

function weekdayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function AttendancePage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: term } = useCurrentTerm();

  const urlDate = searchParams.get('date');
  const urlSlotId = searchParams.get('slotId');

  const [selectedDate, setSelectedDate] = useState(urlDate || todayEAT());
  const [selectedSlotId, setSelectedSlotId] = useState(urlSlotId || '');
  const [overrides, setOverrides] = useState<{ [id: string]: AttendanceStatus }>({});
  const [notes, setNotes] = useState<{ [id: string]: string }>({});
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const termId = term?.id ?? '';

  const { data: slots = [], isPending: isPendingSlots } = useTeacherTimetable(selectedDate);
  const activeSlotId = selectedSlotId || slots[0]?.timetableSlotId || '';
  const queryEnabled = !!activeSlotId && !!termId;

  useEffect(() => {
    if (urlDate) setSelectedDate(urlDate);
    if (urlSlotId) setSelectedSlotId(urlSlotId);
  }, [urlDate, urlSlotId]);

  const { data, isPending: isPendingAttendance, isError } = useDailyAttendance(
    activeSlotId,
    termId,
    selectedDate,
    queryEnabled
  );

  const saveMutation = useSaveAttendance();

  useEffect(() => {
    setOverrides({});
    setNotes({});
    setJustSaved(false);
    setSaveError(null);
  }, [activeSlotId, selectedDate]);

  const activeSlot = slots.find((s) => s.timetableSlotId === activeSlotId);
  // Once submitted, a register is permanently locked — there is no edit path,
  // in the UI or otherwise. The backend enforces this independently (409 on
  // resubmission); this is purely a display concern.
  const alreadySubmitted = !!data?.alreadySubmitted;
  const isInitialTake = !!data && !data.alreadySubmitted;

  const rows = useMemo(() => {
    if (!data) return [];
    return data.students.map((s) => ({
      ...s,
      status: overrides[s.studentId] ?? s.status ?? (isInitialTake ? 'present' : null),
      notes:  notes[s.studentId] ?? s.notes ?? '',
    }));
  }, [data, overrides, notes, isInitialTake]);

  const tally = useMemo(() => {
    const counts: Record<AttendanceStatus, number> = { present: 0, late: 0, absent: 0 };
    let unset = 0;
    for (const r of rows) {
      if (r.status) counts[r.status as AttendanceStatus]++;
      else unset++;
    }
    return { ...counts, unset, total: rows.length };
  }, [rows]);

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
    setSaveError(null);
    const entries: BulkAttendanceEntry[] = rows.map((r) => ({
      studentId: r.studentId,
      status:    r.status ?? 'present',
      notes:     notes[r.studentId] || undefined,
    }));

    try {
      await saveMutation.mutateAsync({ timetableSlotId: activeSlotId, termId, date: selectedDate, entries });
      setOverrides({});
      setNotes({});
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save attendance. Please try again.';
      setSaveError(message);
      const code = (err as { code?: string } | undefined)?.code;
      if (code === 'ALREADY_SUBMITTED') {
        // Another tab/session already submitted this register. Clear local
        // edits so the next refetch settles the UI into the true locked state
        // instead of leaving stale editable rows the server will keep rejecting.
        setOverrides({});
        setNotes({});
      }
    }
  }

  const hasChanges = Object.keys(overrides).length > 0;
  const canSave = isInitialTake ? true : hasChanges;
  const isPending = isPendingSlots || (queryEnabled && isPendingAttendance);

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Attendance</h1>
            <p className="text-xs text-muted-foreground">
              {weekdayLabel(selectedDate)}
              {activeSlot ? ` · ${activeSlot.className} · ${activeSlot.subjectName}` : ''}
            </p>
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

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 bg-muted/30 p-4 rounded-xl border border-border/60">
        <div className="flex flex-col gap-1.5 sm:min-w-[170px]">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Date
          </label>
          <input
            type="date"
            max={todayEAT()}
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedSlotId('');
            }}
            className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm shadow-sm transition-colors hover:border-muted-foreground/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer text-foreground"
          />
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Assigned Period / Lesson
          </label>
          <div className="relative">
            <select
              className="w-full appearance-none rounded-lg border border-border bg-background px-3.5 py-2 pr-9 text-sm shadow-sm transition-colors hover:border-muted-foreground/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer text-foreground disabled:opacity-50"
              value={activeSlotId}
              onChange={(e) => setSelectedSlotId(e.target.value)}
              disabled={slots.length === 0}
            >
              {slots.length === 0 ? (
                <option value="">No classes or periods assigned on this day</option>
              ) : (
                slots.map((s) => (
                  <option key={s.timetableSlotId} value={s.timetableSlotId}>
                    {s.className} — {s.subjectName} · {s.timeLabel} {s.alreadySubmitted ? '· submitted' : ''}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {justSaved && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/10 px-5 py-3 text-sm font-medium text-emerald-800 dark:text-emerald-300 shadow-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Attendance saved and locked for {activeSlot?.className} — {activeSlot?.subjectName}.
        </div>
      )}

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
          {alreadySubmitted && (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/10 px-5 py-3.5 shadow-sm">
              <Lock className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">
                Attendance submitted and locked for {activeSlot?.className} — {activeSlot?.subjectName}.
                <span className="font-normal text-emerald-700/80 dark:text-emerald-400/80">
                  {' '}Contact an administrator if a correction is needed.
                </span>
              </span>
            </div>
          )}

          {isPending ? (
            <AttendanceTableSkeleton />
          ) : isError ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/10 p-8 text-center text-sm text-rose-700 dark:text-rose-400 font-medium shadow-sm">
              <AlertCircle className="h-6 w-6" />
              Failed to load students for this period. Please try again.
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-12 text-center bg-background shadow-sm">
              <Users className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-semibold text-foreground">No students found in this class</p>
              <p className="text-xs text-muted-foreground">
                Ensure active students are enrolled and assigned to this class.
              </p>
            </div>
          ) : (
            <>
              {/* Tally dashboard */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <TallyPill label="Present" count={tally.present} cfg={STATUS_CONFIG.present} />
                  <TallyPill label="Late" count={tally.late} cfg={STATUS_CONFIG.late} />
                  <TallyPill label="Absent" count={tally.absent} cfg={STATUS_CONFIG.absent} />
                  {tally.unset > 0 && (
                    <span className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
                      {tally.unset} unmarked
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">of {tally.total} students</span>
                </div>

                {!alreadySubmitted && (
                  <button
                    onClick={markAllPresent}
                    className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors underline underline-offset-4 self-start sm:self-auto"
                  >
                    Mark all present
                  </button>
                )}
              </div>

              {/* Desktop / tablet table */}
              <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-background shadow-sm">
                <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                                {initials(student.studentName)}
                              </span>
                              <span className="font-semibold text-foreground">{student.studentName}</span>
                            </div>
                          </td>
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

              {/* Mobile card list */}
              <div className="md:hidden space-y-2.5">
                {rows.map((student, idx) => (
                  <div
                    key={student.studentId}
                    className="rounded-xl border border-border bg-background p-4 shadow-sm space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {initials(student.studentName)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {idx + 1}. {student.studentName}
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground/80">{student.learnerId}</p>
                      </div>
                    </div>

                    {alreadySubmitted ? (
                      <div className="flex items-center justify-between">
                        <StatusBadge status={student.status as AttendanceStatus} />
                        {student.notes && (
                          <span className="text-xs text-muted-foreground italic truncate max-w-[50%]">
                            {student.notes}
                          </span>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-1.5">
                          {STATUS_KEYS.map((s) => {
                            const cfg = STATUS_CONFIG[s];
                            const active = student.status === s;
                            return (
                              <button
                                key={s}
                                onClick={() => setStatus(student.studentId, s)}
                                className={[
                                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold transition-all duration-200 active:scale-95',
                                  active
                                    ? `${cfg.bg} ${cfg.border} ${cfg.text} ring-1 ring-inset ring-current/10`
                                    : 'border-border bg-background text-muted-foreground',
                                ].join(' ')}
                              >
                                <cfg.icon className="h-3.5 w-3.5" />
                                {cfg.label}
                              </button>
                            );
                          })}
                        </div>
                        <input
                          type="text"
                          placeholder="Optional note…"
                          value={notes[student.studentId] ?? student.notes ?? ''}
                          onChange={(e) => setNote(student.studentId, e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs placeholder:text-muted-foreground/45 focus:border-primary focus:outline-none text-foreground"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>

              {saveError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/10 px-5 py-3 text-sm font-medium text-rose-700 dark:text-rose-400 shadow-sm">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  {saveError}
                </div>
              )}

              {!alreadySubmitted && (
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                  <p className="text-xs text-muted-foreground text-center sm:text-left">
                    {tally.unset > 0
                      ? `${tally.unset} student${tally.unset > 1 ? 's' : ''} still unmarked.`
                      : 'All students marked.'}
                  </p>
                  <button
                    onClick={handleSave}
                    disabled={saveMutation.isPending || !canSave}
                    className="flex items-center justify-center gap-2.5 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/10 transition-all duration-200 hover:bg-primary/95 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
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

function TallyPill({ label, count, cfg }: { label: string; count: number; cfg: StatusConfig }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
        cfg.bg, cfg.border, cfg.text,
      ].join(' ')}
    >
      <cfg.icon className="h-3.5 w-3.5" />
      {count} {label}
    </span>
  );
}

function StatusBadge({ status }: { status: AttendanceStatus | null }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
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
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="bg-muted/50 px-4 py-3 h-10" />
      <div className="divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted/60" />
              <div className="space-y-1.5">
                <div className="h-4 w-36 animate-pulse rounded bg-muted/80" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted/40" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-20 animate-pulse rounded-lg bg-muted/50" />
              <div className="h-8 w-20 animate-pulse rounded-lg bg-muted/50" />
              <div className="h-8 w-20 animate-pulse rounded-lg bg-muted/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}