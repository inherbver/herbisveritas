-- Crée une vue dans le schéma public pour exposer les données de auth.users.
-- Ceci simplifie les jointures et la gestion des permissions pour PostgREST.
CREATE OR REPLACE VIEW public.users AS
SELECT * FROM auth.users;

-- Accorde la permission de lecture sur cette nouvelle vue au rôle 'authenticated'.
GRANT SELECT ON public.users TO authenticated;
