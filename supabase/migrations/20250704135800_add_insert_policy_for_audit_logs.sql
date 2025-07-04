-- supabase/migrations/20250704135800_add_insert_policy_for_audit_logs.sql

-- Création d'une politique pour autoriser les administrateurs authentifiés
-- à insérer des enregistrements dans la table des journaux d'audit.
-- Cela est nécessaire pour les fonctions côté serveur (comme les API routes Next.js)
-- qui s'exécutent avec les permissions de l'utilisateur connecté.

CREATE POLICY "Admins can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (is_current_user_admin());

COMMENT ON POLICY "Admins can insert audit logs" ON public.audit_logs 
IS 'Permet aux utilisateurs avec le rôle admin d''insérer des journaux d''audit, par exemple depuis les API routes.';
