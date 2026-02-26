
CREATE TABLE public.spatial_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  skin_color text NOT NULL DEFAULT '#F5D0A9',
  hair_color text NOT NULL DEFAULT '#4A3728',
  hair_style integer NOT NULL DEFAULT 0,
  face_style integer NOT NULL DEFAULT 0,
  shirt_style integer NOT NULL DEFAULT 0,
  shirt_color text NOT NULL DEFAULT '#3B82F6',
  pants_style integer NOT NULL DEFAULT 0,
  pants_color text NOT NULL DEFAULT '#1E3A5F',
  house_style integer NOT NULL DEFAULT 0,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.spatial_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view spatial profiles" ON public.spatial_profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert their own spatial profile" ON public.spatial_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own spatial profile" ON public.spatial_profiles FOR UPDATE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.spatial_profiles;
