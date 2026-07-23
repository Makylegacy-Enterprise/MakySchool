'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '@/lib/api/attendance';
import type {
  DailyAttendanceResponse,
  AttendanceAdminOverview,
  StudentAttendanceDossier,
  NotifyParentPayload,
} from '@makyschool/shared';

// Local-only shape: not part of the shared attendance domain model, just the
// options returned by /schools/attendance/timetable for populating the
// teacher's period selector.
export interface TimetableSlot {
  timetableSlotId: string;
  classId: string;
  className: string;
  subjectName: string;
  timeLabel: string;
  periodNumber?: number;
  startTime?: string;
  endTime?: string;
  studentCount?: number;
  alreadySubmitted: boolean;
}

export const attendanceKeys = {
  timetable: (date: string) =>
               ['attendance', 'timetable', date] as const,
  daily:   (timetableSlotId: string, termId: string, date: string) =>
               ['attendance', 'daily', timetableSlotId, termId, date] as const,
  dailyByClass: (classId: string, termId: string, date: string) =>
               ['attendance', 'daily-by-class', classId, termId, date] as const,
  monthly: (classId: string, termId: string, month: string) =>
               ['attendance', 'monthly', classId, termId, month] as const,
  summary: (studentId: string, termId: string) =>
               ['attendance', 'summary', studentId, termId] as const,
  adminOverview: (termId: string, dateFrom: string, dateTo: string, classId: string) =>
               ['attendance', 'admin-overview', termId, dateFrom, dateTo, classId] as const,
  studentDossier: (studentId: string, termId: string, dateFrom: string, dateTo: string) =>
               ['attendance', 'student-dossier', studentId, termId, dateFrom, dateTo] as const,
};

/**
 * ── Fetch Teacher's Active Timetable Slots ──────────────────────────────────
 *
 * Note: we deliberately do NOT pass an explicit generic to useQuery here
 * (e.g. useQuery<TimetableSlot[]>({...})). With TanStack Query v5's overload
 * resolution, an explicit generic on the hook call can fail to unify with
 * the queryFn's inferred type and silently fall back to `unknown`/`never`,
 * producing confusing "can't index type never[]" errors far from the real
 * cause. Annotating the queryFn's return type instead gives v5's inference
 * everything it needs without ambiguity.
 */
export function useTeacherTimetable(date: string, enabled = true) {
  return useQuery({
    queryKey: attendanceKeys.timetable(date),
    queryFn: (): Promise<TimetableSlot[]> => attendanceApi.getTimetable(date),
    enabled: enabled && !!date,
    staleTime: 60_000,
  });
}

/**
 * ── Fetch Daily Register via a teacher's specific Timetable Slot ───────────
 * Use this for the teacher "take attendance" flow only.
 */
export function useDailyAttendance(
  timetableSlotId: string,
  termId: string,
  date: string,
  enabled = true
) {
  return useQuery({
    queryKey: attendanceKeys.daily(timetableSlotId, termId, date),
    queryFn: (): Promise<DailyAttendanceResponse> =>
      attendanceApi.getDaily(timetableSlotId, termId, date),
    enabled: enabled && !!timetableSlotId && !!termId && !!date,
    staleTime: 30_000,
  });
}

/**
 * ── Fetch Daily Register for a whole Class (admin/head_teacher review) ─────
 * Independent of any specific teacher period. Do not pass a timetable/period
 * id through this hook — the backend requires class_id for this path and
 * will reject a timetable_slot_id value here.
 */
export function useDailyAttendanceByClass(
  classId: string,
  termId: string,
  date: string,
  enabled = true
) {
  return useQuery({
    queryKey: attendanceKeys.dailyByClass(classId, termId, date),
    queryFn: (): Promise<DailyAttendanceResponse> =>
      attendanceApi.getDailyByClass(classId, termId, date),
    enabled: enabled && !!classId && !!termId && !!date,
    staleTime: 30_000,
  });
}

export function useMonthlyAttendance(
  classId: string,
  termId: string,
  month: string,
  enabled = true
) {
  return useQuery({
    queryKey: attendanceKeys.monthly(classId, termId, month),
    queryFn: () => attendanceApi.getMonthly(classId, termId, month),
    enabled: enabled && !!classId && !!termId && !!month,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useAttendanceSummary(
  studentId: string,
  termId: string,
  enabled = true
) {
  return useQuery({
    queryKey: attendanceKeys.summary(studentId, termId),
    queryFn: () => attendanceApi.getSummary(studentId, termId),
    enabled: enabled && !!studentId && !!termId,
    staleTime: 60_000,
  });
}

export function useAttendanceAdminOverview(
  termId: string,
  dateFrom: string,
  dateTo: string,
  classId = '',
  enabled = true,
) {
  return useQuery({
    queryKey: attendanceKeys.adminOverview(termId, dateFrom, dateTo, classId),
    queryFn: (): Promise<AttendanceAdminOverview> =>
      attendanceApi.getAdminOverview(termId, dateFrom, dateTo, classId || undefined),
    enabled: enabled && !!termId && !!dateFrom && !!dateTo,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useStudentAttendanceDossier(
  studentId: string,
  termId: string,
  dateFrom = '',
  dateTo = '',
  enabled = true,
) {
  return useQuery({
    queryKey: attendanceKeys.studentDossier(studentId, termId, dateFrom, dateTo),
    queryFn: (): Promise<StudentAttendanceDossier> =>
      attendanceApi.getStudentDossier(
        studentId,
        termId,
        dateFrom || undefined,
        dateTo || undefined,
      ),
    enabled: enabled && !!studentId && !!termId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useNotifyParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { studentId: string; payload: NotifyParentPayload }) =>
      attendanceApi.notifyParent(args.studentId, args.payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: ['attendance', 'student-dossier', variables.studentId],
      });
    },
  });
}

/**
 * ── Save Bulk Attendance Entry Mutation ─────────────────────────────────────
 * Note: the backend permanently locks a submission — a second attempt for
 * the same period+date returns 409 ALREADY_SUBMITTED. Callers should catch
 * that and treat it as already submitted, not retry.
 */
export function useSaveAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      timetableSlotId: string;
      termId: string;
      date: string;
      entries: Array<{ studentId: string; status: string; notes?: string }>;
    }) => attendanceApi.saveBulk(payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: ['attendance', 'daily', variables.timetableSlotId, variables.termId, variables.date],
      });
      qc.invalidateQueries({
        queryKey: ['attendance', 'daily-by-class'],
      });
      qc.invalidateQueries({
        queryKey: ['attendance', 'timetable', variables.date],
      });
      qc.invalidateQueries({
        queryKey: ['attendance', 'monthly'],
      });
      qc.invalidateQueries({
        queryKey: ['attendance', 'admin-overview'],
      });
    },
  });
}
