-- Accorde la permission de lecture sur la table auth.users au rôle 'authenticated'.
-- Ceci est nécessaire pour que PostgREST puisse effectuer des jointures (resource embedding)
-- entre d'autres tables (comme 'profiles') et 'auth.users'.
GRANT SELECT ON TABLE auth.users TO authenticated;
