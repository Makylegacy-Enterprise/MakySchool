-- Link platform admins to central auth (Supabase) identities
ALTER TABLE super_admins ADD COLUMN IF NOT EXISTS auth_user_id UUID;

CREATE INDEX IF NOT EXISTS idx_super_admins_auth_user_id
  ON super_admins (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

COMMENT ON COLUMN super_admins.auth_user_id IS 'User id from central auth / Supabase auth.users';
