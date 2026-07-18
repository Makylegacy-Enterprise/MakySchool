import { apiClient } from './client';
import type {
  DailyAttendanceResponse,
  BulkAttendanceResponse,
  AttendanceSummary,
  MonthlyAttendanceResponse,
} from '@makyschool/shared';
import type { TimetableSlot } from '@/hooks/useAttendance';

export const attendanceApi = {
  /**
   * Fetch teacher's scheduled workload for a specific calendar date
   */
  getTimetable(date: string) {
    return apiClient<TimetableSlot[]>(
      `/api/schools/attendance/timetable?date=${date}`
    ).then((response) => response.data);
  },

  /**
   * Fetch daily register roster driven by a teacher's active timetable period.
   * Use this for the teacher-facing "take attendance" flow.
   */
  getDaily(timetableSlotId: string, termId: string, date: string) {
    return apiClient<DailyAttendanceResponse>(
      `/api/schools/attendance?timetable_slot_id=${timetableSlotId}&term_id=${termId}&date=${date}`,
    ).then((response) => response.data);
  },

  /**
   * Fetch daily register roster for a whole class, independent of any
   * specific teacher period. Use this for admin/head_teacher review views —
   * NEVER pass a timetable/period id here, the backend rejects it.
   */
  getDailyByClass(classId: string, termId: string, date: string) {
    return apiClient<DailyAttendanceResponse>(
      `/api/schools/attendance?class_id=${classId}&term_id=${termId}&date=${date}`,
    ).then((response) => response.data);
  },

  /**
   * Push full room changes up to the database log.
   * Wire format matches BulkAttendancePayload from @makyschool/shared —
   * timetableSlotId is required, since attendance is locked per period.
   */
  saveBulk(payload: {
    timetableSlotId: string;
    termId: string;
    date: string;
    entries: Array<{ studentId: string; status: string; notes?: string }>;
  }) {
    const snakeCasedPayload = {
      timetable_period_id: payload.timetableSlotId,
      term_id: payload.termId,
      date: payload.date,
      entries: payload.entries.map((e) => ({
        student_id: e.studentId,
        status: e.status,
        notes: e.notes || null,
      })),
    };

    return apiClient<BulkAttendanceResponse>('/api/schools/attendance/bulk', {
      method: 'POST',
      body: snakeCasedPayload,
    }).then((response) => response.data);
  },

  getSummary(studentId: string, termId: string) {
    return apiClient<AttendanceSummary>(
      `/api/schools/attendance/summary?student_id=${studentId}&term_id=${termId}`,
    ).then((response) => response.data);
  },

  getMonthly(classId: string, termId: string, month: string) {
    return apiClient<MonthlyAttendanceResponse>(
      `/api/schools/attendance/monthly?class_id=${classId}&term_id=${termId}&month=${month}`,
    ).then((response) => response.data);
  },
};

/** Returns today's date in EAT as YYYY-MM-DD */
export function todayEAT(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'Africa/Kampala',
  });
}