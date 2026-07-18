export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface DailyAttendanceStudent {
  studentId: string;
  studentName: string;
  learnerId: string;
  status: AttendanceStatus | null; // null = not yet recorded today
  notes: string | null;
}

export interface DailyAttendanceResponse {
  date: string;
  classId: string;
  // The specific teacher period/subject slot this roster is scoped to.
  // Populated for the teacher "take attendance" flow (backed by
  // timetable_periods). Null when an admin/head_teacher is reviewing a
  // class-wide submission without pinning to one specific period.
  timetableSlotId: string | null;
  termId: string;
  alreadySubmitted: boolean;
  students: DailyAttendanceStudent[];
}

export interface BulkAttendanceEntry {
  studentId: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface BulkAttendancePayload {
  // Required: attendance is recorded per timetable period/subject slot, not
  // just per class. This ties each submission to exactly one teacher-period
  // combination and is what the unique lock constraint is enforced against.
  timetableSlotId: string;
  termId: string;
  date: string; // YYYY-MM-DD
  entries: BulkAttendanceEntry[];
}

export interface BulkAttendanceResponse {
  saved: number;
  date: string;
  timetableSlotId: string;
}

export interface AttendanceSummary {
  studentId: string;
  termId: string;
  daysAttended: number;
  totalSchoolDays: number;
}

export interface MonthlyAttendanceRow {
  studentId: string;
  studentName: string;
  learnerId: string;
  days: Record<string, AttendanceStatus>; // key = "YYYY-MM-DD (Subject)"
  daysAttended: number;
  totalDays: number;
}

export interface MonthlyAttendanceResponse {
  classId: string;
  termId: string;
  month: string; // YYYY-MM
  schoolDays: string[]; // date+subject columns that had any attendance taken
  rows: MonthlyAttendanceRow[];
}