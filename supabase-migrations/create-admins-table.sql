-- Create admins table for admin user authentication
-- Separate from hospitals table for security and role separation

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  full_name TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comments
COMMENT ON TABLE admins IS 'Admin users who can manage hospital accounts';
COMMENT ON COLUMN admins.username IS 'Unique username for admin login';
COMMENT ON COLUMN admins.role IS 'Admin role: super_admin, admin, viewer';
COMMENT ON COLUMN admins.is_active IS 'Whether this admin account is active';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON admins(is_active);

-- No default admin account is seeded here on purpose: a hardcoded
-- username/password committed to source control is a public credential.
-- Create your first admin with a hash you generate yourself:
--   node scripts/generate-admin-hash.js 'your-own-strong-password'
-- then run the resulting INSERT statement it prints.
