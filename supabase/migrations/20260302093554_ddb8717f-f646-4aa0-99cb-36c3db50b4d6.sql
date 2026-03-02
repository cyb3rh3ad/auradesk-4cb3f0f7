
-- Furniture placements for house interiors
CREATE TABLE public.house_furniture (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  furniture_type TEXT NOT NULL,
  x REAL NOT NULL DEFAULT 0,
  y REAL NOT NULL DEFAULT 0,
  room TEXT NOT NULL DEFAULT 'living',
  variant INTEGER NOT NULL DEFAULT 0,
  rotation REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.house_furniture ENABLE ROW LEVEL SECURITY;

-- Users can read anyone's furniture (for visiting houses)
CREATE POLICY "Anyone can view furniture" ON public.house_furniture
  FOR SELECT USING (true);

-- Users can only modify their own furniture
CREATE POLICY "Users manage own furniture" ON public.house_furniture
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
