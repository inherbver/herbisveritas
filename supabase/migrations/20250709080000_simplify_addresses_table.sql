-- 1. Supprimer la colonne is_default, qui n'est plus pertinente.
alter table public.addresses drop column if exists is_default;

-- 2. Ajouter une contrainte d'unicité pour garantir une seule adresse par type et par utilisateur.
-- Cela prévient les erreurs de données en amont.
alter table public.addresses
add constraint addresses_user_id_address_type_key unique (user_id, address_type);
