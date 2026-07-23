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
  /** Same value as timetableSlotId; preferred name when constructing new payloads. */
  timetablePeriodId?: string;
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

export interface AttendanceAdminKpis {
  activeStudents: number;
  classCount: number;
  schoolDays: number;
  present: number;
  absent: number;
  late: number;
  registersSubmitted: number;
  registersMissing: number;
  averageAttendanceRate: number;
}

export interface AttendanceDailyTrendPoint {
  date: string;
  present: number;
  absent: number;
  late: number;
  attendanceRate: number;
}

export interface AttendanceStatusBreakdown {
  present: number;
  absent: number;
  late: number;
}

export interface AttendanceRegisterCompliance {
  submitted: number;
  missing: number;
  expected: number;
  complianceRate: number;
}

export interface AttendancePerClassRow {
  classId: string;
  className: string;
  studentCount: number;
  schoolDays: number;
  present: number;
  absent: number;
  late: number;
  attendanceRate: number;
  registersSubmitted: number;
  registersMissing: number;
}

export interface AttendanceAdminOverview {
  kpis: AttendanceAdminKpis;
  dailyTrend: AttendanceDailyTrendPoint[];
  statusBreakdown: AttendanceStatusBreakdown;
  registerCompliance: AttendanceRegisterCompliance;
  perClass: AttendancePerClassRow[];
}