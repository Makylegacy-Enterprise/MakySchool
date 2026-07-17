'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '@/lib/api/attendance';
import type { AttendanceStatus } from '@makyschool/shared';

// Shape matching our updated FastAPI backend structures
export interface TimetableSlot {
  timetableSlotId: string;
  classId: string;
  className: string;
  subjectName: string;
  timeLabel: string;
  alreadySubmitted: boolean;
}

export interface AttendanceStudentRow {
  studentId: string;
  studentName: string;
  learnerId: string;
  status: AttendanceStatus | null;
  notes: string;
}

export interface DailyAttendanceResponse {
  date: string;
  timetableSlotId: string;
  termId: string;
  alreadySubmitted: boolean;
  students: AttendanceStudentRow[];
}

export const attendanceKeys = {
  timetable: (date: string) =>
               ['attendance', 'timetable', date] as const,
  daily:   (timetableSlotId: string, termId: string, date: string) =>
               ['attendance', 'daily', timetableSlotId, termId, date] as const,
  monthly: (classId: string, termId: string, month: string) =>
               ['attendance', 'monthly', classId, termId, month] as const,
  summary: (studentId: string, termId: string) =>
               ['attendance', 'summary', studentId, termId] as const,
};

/**
 * ── NEW: Fetch Teacher's Active Timetable Slots ─────────────────────────────
 */
export function useTeacherTimetable(date: string, enabled = true) {
  return useQuery<TimetableSlot[]>({
    queryKey: attendanceKeys.timetable(date),
    queryFn:  () => attendanceApi.getTimetable(date),
    enabled:  enabled && !!date,
    staleTime: 60_000, // 1 minute fresh time buffer
  });
}

/**
 * ── UPDATED: Fetch Daily Register via Timetable Slot ────────────────────────
 */
export function useDailyAttendance(
  timetableSlotId: string,
  termId: string,
  date: string,
  enabled = true
) {
  return useQuery<DailyAttendanceResponse>({
    queryKey: attendanceKeys.daily(timetableSlotId, termId, date),
    queryFn:  () => attendanceApi.getDaily(timetableSlotId, termId, date),
    enabled:  enabled && !!timetableSlotId && !!termId && !!date,
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
    queryFn:  () => attendanceApi.getMonthly(classId, termId, month),
    enabled:  enabled && !!classId && !!termId && !!month,
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
    queryFn:  () => attendanceApi.getSummary(studentId, termId),
    enabled:  enabled && !!studentId && !!termId,
    staleTime: 60_000,
  });
}

/**
 * ── UPDATED: Save Bulk Attendance Entry Mutation ───────────────────────────
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
      // Clear specific active roster query cache immediately
      qc.invalidateQueries({
        queryKey: ['attendance', 'daily', variables.timetableSlotId, variables.termId, variables.date],
      });
      // Force visual timetable checkmark refresh (the little green indicator checkmarks)
      qc.invalidateQueries({
        queryKey: ['attendance', 'timetable', variables.date],
      });
      // Invalidate monthly data charts across active queries
      qc.invalidateQueries({
        queryKey: ['attendance', 'monthly'],
      });
    },
  });
}