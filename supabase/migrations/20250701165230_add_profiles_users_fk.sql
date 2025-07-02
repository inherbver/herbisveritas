-- Ajoute une contrainte de clé étrangère pour lier public.profiles à auth.users.
-- Cela garantit que chaque profil correspond à un utilisateur authentifié existant
-- et active les fonctionnalités de jointure automatique de PostgREST.
-- La suppression en cascade (ON DELETE CASCADE) assure que si un utilisateur
-- est supprimé de auth.users, son profil correspondant est également supprimé.

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey
FOREIGN KEY (id) REFERENCES auth.users (id)
ON DELETE CASCADE;
