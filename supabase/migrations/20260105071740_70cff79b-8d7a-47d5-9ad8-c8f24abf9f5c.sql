-- Create a secure function to search profiles
-- Only returns limited fields: id, username, avatar_url, full_name (no email!)
-- Requires minimum 3 characters to prevent harvesting

CREATE OR REPLACE FUNCTION public.search_profiles(search_query text)
RETURNS TABLE (
  id uuid,
  username text,
  avatar_url text,
  full_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require minimum 3 characters
  IF length(trim(search_query)) < 3 THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.avatar_url,
    p.full_name
  FROM public.profiles p
  WHERE 
    p.id != auth.uid()
    AND (
      p.username ILIKE '%' || trim(search_query) || '%'
    )
  LIMIT 10;
END;
$$;

-- Drop the overly permissive policy that exposes all user data
DROP POLICY IF EXISTS "Users can search profiles to add friends" ON public.profiles;