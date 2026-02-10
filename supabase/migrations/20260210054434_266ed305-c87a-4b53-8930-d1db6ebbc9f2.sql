-- Fix overly permissive INSERT policies

-- 1. teams: replace WITH CHECK (true) with proper auth check
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
CREATE POLICY "Authenticated users can create teams"
ON public.teams
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- 2. conversations: replace WITH CHECK (true) with proper auth check
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND (created_by IS NULL OR auth.uid() = created_by));