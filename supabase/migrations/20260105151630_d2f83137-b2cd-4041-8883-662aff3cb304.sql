-- Add unique constraint on nicknames for user_id + target_user_id if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'nicknames_user_id_target_user_id_key'
    ) THEN
        ALTER TABLE public.nicknames ADD CONSTRAINT nicknames_user_id_target_user_id_key UNIQUE (user_id, target_user_id);
    END IF;
END $$;

-- Ensure RLS is enabled on nicknames
ALTER TABLE public.nicknames ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view their own nicknames" ON public.nicknames;
DROP POLICY IF EXISTS "Users can create their own nicknames" ON public.nicknames;
DROP POLICY IF EXISTS "Users can update their own nicknames" ON public.nicknames;
DROP POLICY IF EXISTS "Users can delete their own nicknames" ON public.nicknames;

-- Users can view their own nicknames
CREATE POLICY "Users can view their own nicknames" 
ON public.nicknames 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own nicknames
CREATE POLICY "Users can create their own nicknames" 
ON public.nicknames 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own nicknames
CREATE POLICY "Users can update their own nicknames" 
ON public.nicknames 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own nicknames
CREATE POLICY "Users can delete their own nicknames" 
ON public.nicknames 
FOR DELETE 
USING (auth.uid() = user_id);