CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT p.role = 'admin'
  INTO is_admin
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN COALESCE(is_admin, false);
END;
$$;
