-- Link attendance to a specific timetable period (subject/teacher/time slot)
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS timetable_period_id uuid REFERENCES public.timetable_periods(id);

-- Enforce one record per student per period per day (needed for the upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_unique_period_daily'
  ) THEN
    ALTER TABLE public.attendance
      ADD CONSTRAINT attendance_unique_period_daily
      UNIQUE (timetable_period_id, student_id, date);
  END IF;
END $$;