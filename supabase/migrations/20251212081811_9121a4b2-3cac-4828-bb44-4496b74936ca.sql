-- Create function to update timestamps if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table for user AI model preferences
CREATE TABLE IF NOT EXISTS public.user_ai_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  default_processing_type TEXT NOT NULL DEFAULT 'summary',
  custom_instructions TEXT,
  enable_background_assistant BOOLEAN NOT NULL DEFAULT false,
  selected_model TEXT NOT NULL DEFAULT 'gemini-flash',
  execution_mode TEXT NOT NULL DEFAULT 'cloud' CHECK (execution_mode IN ('cloud', 'local')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_ai_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own AI preferences"
ON public.user_ai_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI preferences"
ON public.user_ai_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI preferences"
ON public.user_ai_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_ai_preferences_updated_at
BEFORE UPDATE ON public.user_ai_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();