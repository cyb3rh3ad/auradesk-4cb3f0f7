-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Owners can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- Create promo_codes table
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  duration_months INTEGER NOT NULL DEFAULT 12,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active promo codes"
ON public.promo_codes
FOR SELECT
TO authenticated
USING (active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "Owners can manage promo codes"
ON public.promo_codes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- Create promo_code_usage table
CREATE TABLE public.promo_code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stripe_coupon_id TEXT,
  UNIQUE (promo_code_id, user_id)
);

ALTER TABLE public.promo_code_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage"
ON public.promo_code_usage
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Owners can view all usage"
ON public.promo_code_usage
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- Function to increment promo code usage
CREATE OR REPLACE FUNCTION public.increment_promo_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.promo_codes
  SET current_uses = current_uses + 1
  WHERE id = NEW.promo_code_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_promo_code_used
AFTER INSERT ON public.promo_code_usage
FOR EACH ROW
EXECUTE FUNCTION public.increment_promo_usage();