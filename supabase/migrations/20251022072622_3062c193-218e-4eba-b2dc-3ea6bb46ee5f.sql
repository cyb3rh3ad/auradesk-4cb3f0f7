-- Add username to profiles table
ALTER TABLE public.profiles 
ADD COLUMN username text UNIQUE;

-- Add constraint to ensure username is not empty and has proper format
ALTER TABLE public.profiles
ADD CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,20}$');

-- Create index for faster username lookups
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- Add theme and background preferences
ALTER TABLE public.profiles
ADD COLUMN theme text DEFAULT 'system',
ADD COLUMN background_image text,
ADD COLUMN custom_status text;