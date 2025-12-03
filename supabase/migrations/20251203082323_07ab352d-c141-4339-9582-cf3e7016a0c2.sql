-- Create trigger to initialize user subscription on new user signup
CREATE TRIGGER on_auth_user_subscription_init
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_subscription();