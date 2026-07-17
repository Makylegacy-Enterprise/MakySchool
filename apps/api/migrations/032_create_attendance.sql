-- Migration 016: attendance table
-- UC20 / FR-017 / FR-018

CREATE TABLE IF NOT EXISTS public.attendance (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  school_id    uuid        NOT NULL,
  class_id     uuid        NOT NULL,
  student_id   uuid        NOT NULL,
  term_id      uuid        NOT NULL,
  date         date        NOT NULL,
  status       text        NOT NULL DEFAULT 'present'
                           CHECK (status IN ('present', 'absent', 'late')),
  notes        text,
  recorded_by  uuid        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT attendance_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_school_id_fkey
    FOREIGN KEY (school_id)   REFERENCES public.schools(id),
  CONSTRAINT attendance_class_id_fkey
    FOREIGN KEY (class_id)    REFERENCES public.school_classes(id),
  CONSTRAINT attendance_student_id_fkey
    FOREIGN KEY (student_id)  REFERENCES public.students(id),
  CONSTRAINT attendance_term_id_fkey
    FOREIGN KEY (term_id)     REFERENCES public.terms(id),
  CONSTRAINT attendance_recorded_by_fkey
    FOREIGN KEY (recorded_by) REFERENCES public.users(id),

  -- Upsert key: one record per student per class per date
  CONSTRAINT attendance_unique_student_date
    UNIQUE (school_id, class_id, student_id, date)
);

-- Report card summary (term rollup per student)
CREATE INDEX IF NOT EXISTS idx_attendance_student_term
  ON public.attendance (school_id, student_id, term_id);

-- Class teacher daily view
CREATE INDEX IF NOT EXISTS idx_attendance_class_date
  ON public.attendance (school_id, class_id, date);