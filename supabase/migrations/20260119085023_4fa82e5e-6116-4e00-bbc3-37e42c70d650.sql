-- Update search_profiles to also search by full_name, not just username
CREATE OR REPLACE FUNCTION public.search_profiles(search_query text)
 RETURNS TABLE(id uuid, username text, avatar_url text, full_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      OR p.full_name ILIKE '%' || trim(search_query) || '%'
    )
  LIMIT 10;
END;
$function$;