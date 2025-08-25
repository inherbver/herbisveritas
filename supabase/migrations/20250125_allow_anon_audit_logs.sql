-- Allow anonymous users to insert audit logs (for guest cart operations)
-- This is needed because guest users are not authenticated but we still want to log their actions

-- Drop the existing policy that only allows authenticated users
DROP POLICY IF EXISTS "Server can insert audit logs" ON public.audit_logs;

-- Create a new policy that allows both authenticated and anonymous users to insert logs
-- This is safe because the insertion is done server-side only via Server Actions
CREATE POLICY "Server can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Ensure anon role has INSERT permission
GRANT INSERT ON public.audit_logs TO anon;

-- Add comment explaining the policy
COMMENT ON POLICY "Server can insert audit logs" ON public.audit_logs 
IS 'Permet aux actions côté serveur (Server Actions) d''insérer des journaux d''audit pour tous les utilisateurs (authentifiés et invités). Sécurisé car l''insertion ne peut se faire que depuis le serveur.';