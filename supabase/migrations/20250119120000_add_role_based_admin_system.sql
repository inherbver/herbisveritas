-- Migration: Add role-based admin system
-- Date: 2025-01-19
-- Description: Replace hardcoded admin IDs with database-driven role and permission system

-- Add role and permissions columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'editor', 'admin')),
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]';

-- Create index for performance on role queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_permissions ON profiles USING GIN(permissions);

-- Update RLS policies to use the new role system

-- Policy: Only admins can read all profiles
DROP POLICY IF EXISTS "Only admins can read admin data" ON profiles;
CREATE POLICY "Admins can read all profiles" 
ON profiles 
FOR SELECT 
USING (
  auth.uid() = id OR 
  (
    SELECT role FROM profiles WHERE id = auth.uid()
  ) = 'admin'
);

-- Policy: Users can update their own profile, admins can update any profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile, admins can update any" 
ON profiles 
FOR UPDATE 
USING (
  auth.uid() = id OR 
  (
    SELECT role FROM profiles WHERE id = auth.uid()
  ) = 'admin'
);

-- Policy: Only admins can change roles and permissions
CREATE POLICY "Only admins can modify roles and permissions"
ON profiles
FOR UPDATE
USING (
  (
    SELECT role FROM profiles WHERE id = auth.uid()
  ) = 'admin'
)
WITH CHECK (
  -- Allow regular profile updates for non-admin users
  (auth.uid() = id AND OLD.role = NEW.role AND OLD.permissions = NEW.permissions) OR
  -- Allow role/permission changes only for admins
  (
    SELECT role FROM profiles WHERE id = auth.uid()
  ) = 'admin'
);

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role FROM profiles WHERE id = user_id
  ) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check specific permission
CREATE OR REPLACE FUNCTION has_permission(permission_name TEXT, user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  user_permissions JSONB;
  user_role TEXT;
BEGIN
  SELECT role, permissions INTO user_role, user_permissions
  FROM profiles 
  WHERE id = user_id;
  
  -- Admins with wildcard permission have all permissions
  IF user_role = 'admin' AND user_permissions ? '*' THEN
    RETURN TRUE;
  END IF;
  
  -- Check specific permission
  RETURN user_permissions ? permission_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit_logs table if it doesn't exist (for security logging)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for audit logs performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- RLS for audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read audit logs
CREATE POLICY "Only admins can read audit logs"
ON audit_logs
FOR SELECT
USING (is_admin());

-- Policy: Any authenticated user can insert audit logs (for security events)
CREATE POLICY "Authenticated users can insert audit logs"
ON audit_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Audit logs are immutable (no updates/deletes)
CREATE POLICY "Audit logs are immutable"
ON audit_logs
FOR UPDATE
USING (false);

CREATE POLICY "Audit logs cannot be deleted"
ON audit_logs
FOR DELETE
USING (false);

-- Seed data: Set the emergency admin user as admin
-- This uses the environment variable ADMIN_PRINCIPAL_ID as a one-time setup
DO $$
DECLARE
  admin_uuid TEXT;
BEGIN
  -- This will be set during deployment with the actual admin UUID
  -- For now, we'll use a placeholder that should be updated manually
  admin_uuid := COALESCE(
    current_setting('app.admin_principal_id', true),
    '245eba22-0041-44d1-94ee-9ca71d3d561d' -- Fallback to current admin ID
  );
  
  -- Only update if the user exists in profiles
  IF EXISTS (SELECT 1 FROM profiles WHERE id = admin_uuid::UUID) THEN
    UPDATE profiles 
    SET 
      role = 'admin',
      permissions = '["*"]'::JSONB
    WHERE id = admin_uuid::UUID;
    
    RAISE NOTICE 'Admin role assigned to user: %', admin_uuid;
  ELSE
    RAISE NOTICE 'Admin user % not found in profiles table', admin_uuid;
  END IF;
END $$;

-- Grant necessary permissions for the admin service functions
GRANT SELECT ON profiles TO postgres;
GRANT INSERT, SELECT ON audit_logs TO postgres;

-- Comment for documentation
COMMENT ON COLUMN profiles.role IS 'User role: user, editor, or admin. Determines access level.';
COMMENT ON COLUMN profiles.permissions IS 'JSON array of specific permissions. Admins with ["*"] have all permissions.';
COMMENT ON TABLE audit_logs IS 'Security and admin action audit trail. Immutable logs for compliance.';

-- Create a view for admin dashboard (admin users only)
CREATE OR REPLACE VIEW admin_user_overview AS
SELECT 
  p.id,
  p.email,
  p.role,
  p.permissions,
  p.created_at,
  p.updated_at,
  au.email_confirmed_at,
  au.last_sign_in_at
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE is_admin();

-- Grant access to the view
GRANT SELECT ON admin_user_overview TO postgres;

COMMENT ON VIEW admin_user_overview IS 'Admin-only view showing user management information with auth details.';