-- Add applicable_plans column to promo_codes table
ALTER TABLE public.promo_codes 
ADD COLUMN applicable_plans text[] DEFAULT ARRAY['advanced', 'professional'];