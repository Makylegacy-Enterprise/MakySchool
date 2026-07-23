-- Migration 034: Fix attendance uniqueness for per-period recording
-- Drops the class-level unique constraint that blocked multiple subjects/day,
-- keeps a non-unique index for class/date lookups, and adds a period+date index.

ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_unique_student_date;

CREATE INDEX IF NOT EXISTS idx_attendance_school_class_student_date
  ON public.attendance (school_id, class_id, student_id, date);

CREATE INDEX IF NOT EXISTS idx_attendance_period_date
  ON public.attendance (timetable_period_id, date)
  WHERE timetable_period_id IS NOT NULL;
