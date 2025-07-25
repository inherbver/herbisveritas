-- Fix: Corriger le trigger handle_new_user pour utiliser les bonnes colonnes de la table profiles
-- Problème: Le trigger utilise des colonnes qui n'existent pas (full_name, app_role)

-- Créer ou remplacer la fonction handle_new_user avec les bonnes colonnes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Ignorer les utilisateurs anonymes (sans email)
  IF NEW.email IS NULL THEN
    RAISE LOG 'Utilisateur anonyme créé, pas de profil nécessaire: id=%', NEW.id;
    RETURN NEW;
  END IF;

  -- Créer un profil seulement pour les utilisateurs avec email
  -- Utiliser les colonnes qui existent réellement dans la table profiles
  INSERT INTO public.profiles (
    id, 
    first_name, 
    last_name, 
    billing_address_is_different
  )
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'first_name', NULL), 
    COALESCE(NEW.raw_user_meta_data->>'last_name', NULL),
    false
  );
  
  RAISE LOG 'Profil créé pour utilisateur authentifié: id=%, email=%', NEW.id, NEW.email;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erreur lors de la création du profil pour %: %', NEW.id, SQLERRM;
    -- Ne pas faire échouer la création de l'utilisateur si le profil échoue
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- S'assurer que le trigger existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Créer le profil manquant pour l'utilisateur spécifique si il n'existe pas
DO $$
BEGIN
  -- Vérifier si l'utilisateur 527c0b3b-20b5-4a2b-bd24-b04640a5bf41 a un profil
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = '527c0b3b-20b5-4a2b-bd24-b04640a5bf41'
  ) THEN
    -- Créer le profil manquant
    INSERT INTO public.profiles (
      id, 
      first_name, 
      last_name, 
      billing_address_is_different
    )
    VALUES (
      '527c0b3b-20b5-4a2b-bd24-b04640a5bf41',
      NULL,
      NULL,
      false
    );
    
    RAISE LOG 'Profil créé pour utilisateur existant: 527c0b3b-20b5-4a2b-bd24-b04640a5bf41';
  ELSE
    RAISE LOG 'Profil existe déjà pour: 527c0b3b-20b5-4a2b-bd24-b04640a5bf41';
  END IF;
END $$;
