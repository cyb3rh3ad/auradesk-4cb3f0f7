-- Fix the initialize_user_subscription function to use correct search_path
CREATE OR REPLACE FUNCTION public.initialize_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, plan)
  VALUES (NEW.id, 'free');
  
  INSERT INTO public.file_storage_usage (user_id, total_bytes)
  VALUES (NEW.id, 0);
  
  RETURN NEW;
END;
$function$;