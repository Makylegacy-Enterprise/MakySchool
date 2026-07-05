-- School learner ID settings and two-phase student import staging.

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS learner_id_prefix TEXT,
  ADD COLUMN IF NOT EXISTS learner_id_suffix_length INT NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS learner_id_mode TEXT NOT NULL DEFAULT 'sequential';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'schools_learner_id_mode_check'
  ) THEN
    ALTER TABLE schools
      ADD CONSTRAINT schools_learner_id_mode_check
      CHECK (learner_id_mode IN ('sequential', 'random'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'schools_learner_id_suffix_length_check'
  ) THEN
    ALTER TABLE schools
      ADD CONSTRAINT schools_learner_id_suffix_length_check
      CHECK (learner_id_suffix_length BETWEEN 4 AND 10);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS student_import_jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  imported_by      UUID REFERENCES users(id),
  filename         TEXT,
  total_rows       INT NOT NULL DEFAULT 0,
  valid_count      INT NOT NULL DEFAULT 0,
  error_count      INT NOT NULL DEFAULT 0,
  duplicate_count  INT NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'preview'
                     CHECK (status IN ('preview', 'committed', 'expired', 'failed')),
  options          JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '2 hours',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_import_staging (
  job_id       UUID NOT NULL REFERENCES student_import_jobs(id) ON DELETE CASCADE,
  row_number   INT NOT NULL,
  payload      JSONB NOT NULL,
  fingerprint  TEXT NOT NULL,
  status       TEXT NOT NULL
                 CHECK (status IN ('valid', 'error', 'duplicate_in_file', 'duplicate_existing')),
  issues       JSONB NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY (job_id, row_number)
);

CREATE INDEX IF NOT EXISTS idx_student_import_jobs_school
  ON student_import_jobs (school_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_import_staging_job
  ON student_import_staging (job_id);

CREATE INDEX IF NOT EXISTS idx_student_import_staging_fingerprint
  ON student_import_staging (job_id, fingerprint);
