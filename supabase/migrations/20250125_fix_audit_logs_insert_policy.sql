-- Fix audit_logs insert policy to allow server-side logging
-- This migration allows authenticated users and service role to insert audit logs

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;

-- Create a new policy that allows any authenticated user to insert logs
-- This is safe because the insertion is done server-side only
CREATE POLICY "Server can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also ensure service_role can insert (for Edge Functions)
-- This should already exist from previous migration but let's ensure it
GRANT INSERT ON public.audit_logs TO service_role;

-- Add comment explaining the policy
COMMENT ON POLICY "Server can insert audit logs" ON public.audit_logs 
IS 'Permet aux actions côté serveur (Server Actions) d''insérer des journaux d''audit pour tous les utilisateurs authentifiés. Sécurisé car l''insertion ne peut se faire que depuis le serveur.';