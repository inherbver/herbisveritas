-- This migration permanently grants SELECT permission on auth.users to the postgres role.
-- After extensive debugging, it has become clear that even with SECURITY DEFINER,
-- the postgres role requires explicit permission to read the auth.users table
-- to verify the foreign key constraint when inserting into the orders table.
-- This is likely the final piece of the puzzle to resolve the silent transaction rollbacks.

GRANT SELECT ON TABLE auth.users TO postgres;
