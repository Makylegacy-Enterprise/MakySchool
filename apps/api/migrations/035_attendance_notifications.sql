-- Migration 035: attendance parent notification outbox + dedup

CREATE TABLE IF NOT EXISTS public.attendance_notifications (
  id                   uuid        NOT NULL DEFAULT gen_random_uuid(),
  school_id            uuid        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id           uuid        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_id          uuid        REFERENCES public.student_guardians(id) ON DELETE SET NULL,
  trigger_type         text        NOT NULL
                         CHECK (trigger_type IN ('period_absent', 'day_absent', 'chronic', 'manual')),
  attendance_date      date        NOT NULL,
  timetable_period_id  uuid        REFERENCES public.timetable_periods(id) ON DELETE SET NULL,
  channel              text        NOT NULL DEFAULT 'sms'
                         CHECK (channel IN ('sms', 'in_app')),
  message_body         text        NOT NULL,
  status               text        NOT NULL DEFAULT 'queued'
                         CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  provider_ref         text,
  triggered_by         uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  sent_at              timestamptz,

  CONSTRAINT attendance_notifications_pkey PRIMARY KEY (id)
);

-- Dedup: one notification per student/trigger/date/period (NULL period → day-level)
CREATE UNIQUE INDEX IF NOT EXISTS attendance_notifications_dedup_idx
  ON public.attendance_notifications (
    school_id,
    student_id,
    trigger_type,
    attendance_date,
    COALESCE(timetable_period_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE INDEX IF NOT EXISTS idx_attendance_notifications_student
  ON public.attendance_notifications (school_id, student_id, created_at DESC);
