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
  Search,
} from 'lucide-react';
import { useDailyAttendance, useSaveAttendance, useTeacherTimetable } from '@/hooks/useAttendance';
import type { TimetableSlot } from '@/hooks/useAttendance';
import { todayEAT } from '@/lib/api/attendance';
import type { AttendanceStatus, BulkAttendanceEntry } from '@makyschool/shared';
import { useCurrentTerm } from '@/hooks/useCurrentTerm';
import { TablePagination } from '@makyschool/ui/components/ui/TablePagination';
import { useClientPagination } from '@/hooks/useClientPagination';

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
const DRAFT_PREFIX = 'makyschool:attendance-draft:';

type DraftState = {
  overrides: { [id: string]: AttendanceStatus };
  notes: { [id: string]: string };
};

function draftKey(slotId: string, date: string) {
  return `${DRAFT_PREFIX}${slotId}:${date}`;
}

function loadDraft(slotId: string, date: string): DraftState | null {
  if (typeof window === 'undefined' || !slotId) return null;
  try {
    const raw = localStorage.getItem(draftKey(slotId, date));
    if (!raw) return null;
    return JSON.parse(raw) as DraftState;
  } catch {
    return null;
  }
}

function saveDraftToStorage(slotId: string, date: string, draft: DraftState) {
  if (typeof window === 'undefined' || !slotId) return;
  try {
    localStorage.setItem(draftKey(slotId, date), JSON.stringify(draft));
  } catch {
    /* ignore quota */
  }
}

function clearDraft(slotId: string, date: string) {
  if (typeof window === 'undefined' || !slotId) return;
  localStorage.removeItem(draftKey(slotId, date));
}

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
  const urlClassId = searchParams.get('classId');

  const [selectedDate, setSelectedDate] = useState(urlDate || todayEAT());
  const [selectedSlotId, setSelectedSlotId] = useState(urlSlotId || '');
  const [overrides, setOverrides] = useState<{ [id: string]: AttendanceStatus }>({});
  const [notes, setNotes] = useState<{ [id: string]: string }>({});
  const [selectedIds, setSelectedIds] = useState<{ [id: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [forceLocked, setForceLocked] = useState(false);

  const termId = term?.id ?? '';

  const { data: slots = [], isPending: isPendingSlots } = useTeacherTimetable(selectedDate);
  const activeSlotId = selectedSlotId;
  const queryEnabled = !!activeSlotId && !!termId;

  useEffect(() => {
    if (urlDate) setSelectedDate(urlDate);
    if (urlSlotId) setSelectedSlotId(urlSlotId);
  }, [urlDate, urlSlotId]);

  useEffect(() => {
    if (urlSlotId || selectedSlotId || !urlClassId || slots.length === 0) return;
    const match = slots.find((s) => s.classId === urlClassId);
    if (match) setSelectedSlotId(match.timetableSlotId);
  }, [urlClassId, urlSlotId, selectedSlotId, slots]);

  const { data, isPending: isPendingAttendance, isError } = useDailyAttendance(
    activeSlotId,
    termId,
    selectedDate,
    queryEnabled
  );

  const saveMutation = useSaveAttendance();

  useEffect(() => {
    setSelectedIds({});
    setSearchQuery('');
    setJustSaved(false);
    setDraftSaved(false);
    setSaveError(null);
    setForceLocked(false);

    const draft = loadDraft(activeSlotId, selectedDate);
    if (draft) {
      setOverrides(draft.overrides);
      setNotes(draft.notes);
    } else {
      setOverrides({});
      setNotes({});
    }
  }, [activeSlotId, selectedDate]);

  const activeSlot = slots.find((s) => s.timetableSlotId === activeSlotId);
  const alreadySubmitted = forceLocked || !!data?.alreadySubmitted;
  const isInitialTake = !!data && !alreadySubmitted;

  const rows = useMemo(() => {
    if (!data) return [];
    return data.students.map((s) => ({
      ...s,
      status: overrides[s.studentId] ?? s.status ?? (isInitialTake ? 'present' as AttendanceStatus : null),
      notes:  notes[s.studentId] ?? s.notes ?? '',
    }));
  }, [data, overrides, notes, isInitialTake]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.learnerId.toLowerCase().includes(q),
    );
  }, [rows, searchQuery]);

  const {
    paged: pagedRows,
    page,
    setPage,
    pageSize,
    setPageSize,
    total: filteredTotal,
  } = useClientPagination({
    items: filteredRows,
    resetDeps: [activeSlotId, selectedDate, searchQuery],
  });

  const tally = useMemo(() => {
    const counts: { [K in AttendanceStatus]: number } = { present: 0, late: 0, absent: 0 };
    let unset = 0;
    for (const r of rows) {
      if (r.status) counts[r.status as AttendanceStatus]++;
      else unset++;
    }
    return { ...counts, unset, total: rows.length };
  }, [rows]);

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;

  function setStatus(studentId: string, st: AttendanceStatus) {
    if (alreadySubmitted) return;
    setOverrides((prev) => ({ ...prev, [studentId]: st }));
  }

  function setNote(studentId: string, note: string) {
    if (alreadySubmitted) return;
    setNotes((prev) => ({ ...prev, [studentId]: note }));
  }

  function toggleSelect(studentId: string) {
    setSelectedIds((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  }

  function toggleSelectAllOnPage() {
    const allSelected = pagedRows.every((r) => selectedIds[r.studentId]);
    setSelectedIds((prev) => {
      const next = { ...prev };
      for (const r of pagedRows) {
        next[r.studentId] = !allSelected;
      }
      return next;
    });
  }

  function markBulk(st: AttendanceStatus) {
    if (alreadySubmitted) return;
    const targets =
      selectedCount > 0
        ? rows.filter((r) => selectedIds[r.studentId]).map((r) => r.studentId)
        : rows.map((r) => r.studentId);
    setOverrides((prev) => {
      const next = { ...prev };
      for (const id of targets) next[id] = st;
      return next;
    });
  }

  function handleSaveDraft() {
    if (!activeSlotId || alreadySubmitted) return;
    saveDraftToStorage(activeSlotId, selectedDate, { overrides, notes });
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2500);
  }

  async function handleSubmit() {
    if (!activeSlotId || !data || alreadySubmitted) return;
    setSaveError(null);

    // Build entries in a single pass immediately before the API call.
    const entries: BulkAttendanceEntry[] = [];
    for (const s of data.students) {
      entries.push({
        studentId: s.studentId,
        status: overrides[s.studentId] ?? s.status ?? 'present',
        notes: notes[s.studentId] || undefined,
      });
    }

    try {
      await saveMutation.mutateAsync({
        timetableSlotId: activeSlotId,
        termId,
        date: selectedDate,
        entries,
      });
      clearDraft(activeSlotId, selectedDate);
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
        setForceLocked(true);
        setOverrides({});
        setNotes({});
        clearDraft(activeSlotId, selectedDate);
      }
    }
  }

  function onDateChange(next: string) {
    setSelectedDate(next);
    setSelectedSlotId('');
    setOverrides({});
    setNotes({});
    setSelectedIds({});
    setForceLocked(false);
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 border-b border-border pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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

          <div className="flex flex-col gap-1.5 sm:min-w-[170px]">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Date
            </label>
            <input
              type="date"
              max={todayEAT()}
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm shadow-sm transition-colors hover:border-muted-foreground/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer text-foreground"
            />
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

      {justSaved && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/10 px-5 py-3 text-sm font-medium text-emerald-800 dark:text-emerald-300 shadow-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Attendance submitted and locked for {activeSlot?.className} — {activeSlot?.subjectName}.
        </div>
      )}

      {draftSaved && (
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-5 py-3 text-sm font-medium text-foreground shadow-sm">
          Draft saved on this device. Submit when ready to lock the register.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4 lg:gap-6">
        {/* Left: period list */}
        <aside className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Periods
          </h2>
          {isPendingSlots ? (
            <PeriodSkeletonList />
          ) : slots.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-8 text-center bg-muted/10">
              <CalendarDays className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-semibold text-foreground">No timetable periods assigned for this date.</p>
              <p className="text-xs text-muted-foreground">
                Select another date or verify assignments with your school administrator.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {slots.map((slot) => (
                <PeriodCard
                  key={slot.timetableSlotId}
                  slot={slot}
                  selected={slot.timetableSlotId === activeSlotId}
                  onSelect={() => setSelectedSlotId(slot.timetableSlotId)}
                />
              ))}
            </div>
          )}
        </aside>

        {/* Right: register */}
        <section className="min-w-0">
          {!activeSlotId ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-14 text-center bg-muted/10 min-h-[320px]">
              <Users className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-semibold text-foreground">Select a period</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Choose a timetable period from the left to load the class register.
              </p>
            </div>
          ) : isPendingAttendance ? (
            <RegisterSkeleton />
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
            <div className="space-y-4">
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
              </div>

              {!alreadySubmitted && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => markBulk('present')}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50"
                  >
                    Mark all present{selectedCount > 0 ? ` (${selectedCount})` : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => markBulk('absent')}
                    className="rounded-lg border border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50"
                  >
                    Mark all absent{selectedCount > 0 ? ` (${selectedCount})` : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => markBulk('late')}
                    className="rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50"
                  >
                    Mark all late{selectedCount > 0 ? ` (${selectedCount})` : ''}
                  </button>
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                <input
                  type="text"
                  placeholder="Search by name or learner ID…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={alreadySubmitted}
                  className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground disabled:opacity-50"
                />
              </div>

              <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-background shadow-sm">
                <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3.5 w-10">
                          {!alreadySubmitted && (
                            <input
                              type="checkbox"
                              checked={pagedRows.length > 0 && pagedRows.every((r) => selectedIds[r.studentId])}
                              onChange={toggleSelectAllOnPage}
                              className="rounded border-border"
                              aria-label="Select all on page"
                            />
                          )}
                        </th>
                        <th className="px-4 py-3.5 w-12">#</th>
                        <th className="px-4 py-3.5">Student</th>
                        <th className="px-4 py-3.5 w-72">Status</th>
                        <th className="px-4 py-3.5 min-w-[160px]">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pagedRows.map((student, idx) => (
                        <tr key={student.studentId} className="bg-background hover:bg-muted/10 transition-colors duration-150">
                          <td className="px-4 py-3">
                            {!alreadySubmitted && (
                              <input
                                type="checkbox"
                                checked={!!selectedIds[student.studentId]}
                                onChange={() => toggleSelect(student.studentId)}
                                className="rounded border-border"
                                aria-label={`Select ${student.studentName}`}
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-medium">
                            {(page - 1) * pageSize + idx + 1}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                                {initials(student.studentName)}
                              </span>
                              <div className="min-w-0">
                                <span className="font-semibold text-foreground block truncate">{student.studentName}</span>
                                <span className="font-mono text-[11px] text-muted-foreground/80">{student.learnerId}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
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
                                      type="button"
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
                          <td className="px-4 py-3">
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

              <div className="md:hidden space-y-2.5">
                {pagedRows.map((student, idx) => (
                  <div
                    key={student.studentId}
                    className="rounded-xl border border-border bg-background p-4 shadow-sm space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      {!alreadySubmitted && (
                        <input
                          type="checkbox"
                          checked={!!selectedIds[student.studentId]}
                          onChange={() => toggleSelect(student.studentId)}
                          className="rounded border-border"
                        />
                      )}
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {initials(student.studentName)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {(page - 1) * pageSize + idx + 1}. {student.studentName}
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground/80">{student.learnerId}</p>
                      </div>
                    </div>

                    {alreadySubmitted ? (
                      <StatusBadge status={student.status as AttendanceStatus} />
                    ) : (
                      <>
                        <div className="flex gap-1.5">
                          {STATUS_KEYS.map((s) => {
                            const cfg = STATUS_CONFIG[s];
                            const active = student.status === s;
                            return (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setStatus(student.studentId, s)}
                                className={[
                                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold transition-all duration-200 active:scale-95',
                                  active
                                    ? `${cfg.bg} ${cfg.border} ${cfg.text}`
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
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none text-foreground"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>

              <TablePagination
                page={page}
                pageSize={pageSize}
                total={filteredTotal}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                noun="students"
              />

              {saveError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/10 px-5 py-3 text-sm font-medium text-rose-700 dark:text-rose-400 shadow-sm">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  {saveError}
                </div>
              )}

              {!alreadySubmitted && (
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                  >
                    Save draft
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saveMutation.isPending}
                    className="flex items-center justify-center gap-2.5 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/10 transition-all duration-200 hover:bg-primary/95 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {saveMutation.isPending && (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    )}
                    Submit register
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function PeriodCard({
  slot,
  selected,
  onSelect,
}: {
  slot: TimetableSlot;
  selected: boolean;
  onSelect: () => void;
}) {
  const timeRange =
    slot.startTime && slot.endTime
      ? `${slot.startTime} – ${slot.endTime}`
      : slot.timeLabel;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'w-full text-left rounded-xl border p-3.5 transition-all duration-200 shadow-sm',
        selected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border bg-background hover:border-muted-foreground/30 hover:bg-muted/20',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground">{timeRange}</p>
          <p className="text-sm font-semibold text-foreground mt-0.5 truncate">
            {slot.periodNumber != null ? `Period ${slot.periodNumber} · ` : ''}
            {slot.subjectName}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{slot.className}</p>
          <p className="text-[11px] text-muted-foreground/80 mt-1">
            {slot.studentCount ?? '—'} students
          </p>
        </div>
        <span
          className={[
            'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            slot.alreadySubmitted
              ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
              : 'border-border bg-muted/40 text-muted-foreground',
          ].join(' ')}
        >
          {slot.alreadySubmitted ? 'Submitted' : 'Not marked'}
        </span>
      </div>
    </button>
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

function PeriodSkeletonList() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border p-3.5 space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
          <div className="h-4 w-40 animate-pulse rounded bg-muted/80" />
          <div className="h-3 w-28 animate-pulse rounded bg-muted/40" />
        </div>
      ))}
    </div>
  );
}

function RegisterSkeleton() {
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
