-- Migration 036: discipline incident records

CREATE TABLE IF NOT EXISTS public.discipline_records (
  id                      uuid        NOT NULL DEFAULT gen_random_uuid(),
  school_id               uuid        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id              uuid        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id                 uuid        NOT NULL REFERENCES public.terms(id),
  class_id                uuid        REFERENCES public.school_classes(id) ON DELETE SET NULL,
  incident_date           date        NOT NULL,
  incident_type           text        NOT NULL
                            CHECK (incident_type IN ('minor', 'major', 'commendation')),
  category                text,
  description             text        NOT NULL,
  action_taken            text,
  recorded_by             uuid        NOT NULL REFERENCES public.users(id),
  head_teacher_remarks    text,
  remarked_by             uuid        REFERENCES public.users(id),
  remarked_at             timestamptz,
  status                  text        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'voided')),
  voided_reason           text,
  voided_by               uuid        REFERENCES public.users(id),
  voided_at               timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT discipline_records_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_discipline_school_term_type
  ON public.discipline_records (school_id, term_id, incident_type)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_discipline_student_date
  ON public.discipline_records (school_id, student_id, incident_date DESC);

CREATE INDEX IF NOT EXISTS idx_discipline_school_date
  ON public.discipline_records (school_id, incident_date DESC)
  WHERE status = 'active';
