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

-- Insert default admin account (password: admin123! - MUST CHANGE AFTER FIRST LOGIN)
-- Password hash for 'admin123!' generated with bcrypt rounds=10
INSERT INTO admins (username, password_hash, role, full_name, email)
VALUES (
  'admin',
  '$2a$10$8K1p/a0dL3LdGfwxTXLnkuH0vZC0h4O6A7E3kUP5Y7YUvIBLMQEqG',
  'super_admin',
  'System Administrator',
  'admin@medblogai.com'
)
ON CONFLICT (username) DO NOTHING;

-- Note: Default password is 'admin123!'
-- IMPORTANT: Change this password immediately after first login!
