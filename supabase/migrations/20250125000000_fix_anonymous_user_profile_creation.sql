-- Fix: Permet aux utilisateurs anonymes d'être créés sans erreur de profil
-- Problème: Les triggers handle_new_user et handle_new_user_role tentent de créer des profils
-- pour tous les utilisateurs, y compris les utilisateurs anonymes qui n'ont pas d'email

-- Créer ou remplacer la fonction handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Ignorer les utilisateurs anonymes (sans email)
  IF NEW.email IS NULL THEN
    -- Log pour debugging
    RAISE LOG 'Utilisateur anonyme créé, pas de profil nécessaire: id=%', NEW.id;
    RETURN NEW;
  END IF;

  -- Créer un profil seulement pour les utilisateurs avec email
  INSERT INTO public.profiles (id, full_name, avatar_url, app_role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    'user'::app_role
  );
  
  RAISE LOG 'Profil créé pour utilisateur authentifié: id=%, email=%', NEW.id, NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer ou remplacer la fonction handle_new_user_role
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Ignorer les utilisateurs anonymes (sans email)
  IF NEW.email IS NULL THEN
    -- Log pour debugging
    RAISE LOG 'Utilisateur anonyme, pas de rôle metadata nécessaire: id=%', NEW.id;
    RETURN NEW;
  END IF;

  -- Mise à jour des métadonnées seulement pour les utilisateurs avec email
  UPDATE auth.users 
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"app_role": "user"}'::jsonb
  WHERE id = NEW.id;
  
  RAISE LOG 'Rôle metadata assigné pour utilisateur authentifié: id=%, email=%', NEW.id, NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Les triggers restent les mêmes, mais les fonctions sont maintenant adaptées
-- pour gérer correctement les utilisateurs anonymes