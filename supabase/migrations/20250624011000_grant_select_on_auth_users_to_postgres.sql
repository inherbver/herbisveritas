-- This migration grants the 'postgres' role SELECT permission on the 'auth.users' table.
-- This is the definitive fix for the silent failures in the SECURITY DEFINER function,
-- which needs to read this table to validate the user_id foreign key or, in our canary test,
-- to retrieve a test user ID.
-- This is a common requirement when using SECURITY DEFINER with Supabase's auth schema.

GRANT SELECT ON TABLE auth.users TO postgres;
