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
  classId: string;
  termId: string;
  date: string; // YYYY-MM-DD
  entries: BulkAttendanceEntry[];
}

export interface BulkAttendanceResponse {
  saved: number;
  date: string;
  classId: string;
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
  days: Record<string, AttendanceStatus>; // key = "YYYY-MM-DD"
  daysAttended: number;
  totalDays: number;
}

export interface MonthlyAttendanceResponse {
  classId: string;
  termId: string;
  month: string; // YYYY-MM
  schoolDays: string[]; // dates that had any attendance taken
  rows: MonthlyAttendanceRow[];
}