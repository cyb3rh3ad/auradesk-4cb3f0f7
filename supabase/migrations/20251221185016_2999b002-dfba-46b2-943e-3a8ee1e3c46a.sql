-- Add last_used_model column to ai_chat_sessions
ALTER TABLE public.ai_chat_sessions 
ADD COLUMN last_used_model TEXT DEFAULT 'gemini-2.5-flash';