-- Fix profile duplicates and incorrect handle_new_user function
-- Issue: Multiple profiles for same user causing "JSON object requested, multiple rows returned"

-- 1. First, let's check for duplicate profiles
DO $$
DECLARE
    duplicate_count INTEGER;
    user_id UUID := '527c0b3b-20b5-4a2b-bd24-b04640a5bf41';
BEGIN
    -- Count profiles for the problematic user
    SELECT COUNT(*) INTO duplicate_count
    FROM public.profiles 
    WHERE id = user_id;
    
    RAISE NOTICE 'User % has % profile(s)', user_id, duplicate_count;
    
    -- If there are duplicates, keep only the first one (oldest created_at)
    IF duplicate_count > 1 THEN
        DELETE FROM public.profiles 
        WHERE id = user_id 
        AND created_at NOT IN (
            SELECT MIN(created_at) 
            FROM public.profiles 
            WHERE id = user_id
        );
        
        RAISE NOTICE 'Removed % duplicate profile(s) for user %', (duplicate_count - 1), user_id;
    END IF;
END $$;

-- 2. Fix the handle_new_user function to match current schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Ignore anonymous users (without email)
  IF NEW.email IS NULL THEN
    RAISE LOG 'Anonymous user created, no profile needed: id=%', NEW.id;
    RETURN NEW;
  END IF;

  -- Create profile only for users with email, using correct column names
  INSERT INTO public.profiles (id, first_name, last_name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''), 
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'user'::app_role
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicates
  
  RAISE LOG 'Profile created for authenticated user: id=%, email=%', NEW.id, NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
        
        RAISE NOTICE 'Created trigger on_auth_user_created';
    ELSE
        RAISE NOTICE 'Trigger on_auth_user_created already exists';
    END IF;
END $$;

-- 4. Add a unique constraint to prevent future duplicates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_id_unique'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_id_unique UNIQUE (id);
        
        RAISE NOTICE 'Added unique constraint on profiles.id';
    ELSE
        RAISE NOTICE 'Unique constraint on profiles.id already exists';
    END IF;
END $$;
