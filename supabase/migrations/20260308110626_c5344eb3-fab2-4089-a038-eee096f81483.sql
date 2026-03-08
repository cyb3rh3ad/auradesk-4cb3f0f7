
-- Create a function for searching messages across user's conversations
CREATE OR REPLACE FUNCTION public.search_messages(search_query text, max_results integer DEFAULT 50)
RETURNS TABLE(
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  content text,
  created_at timestamptz,
  conversation_name text,
  sender_name text,
  sender_avatar text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF length(trim(search_query)) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.created_at,
    COALESCE(c.name, p_other.full_name, p_other.email, 'Chat') AS conversation_name,
    COALESCE(p_sender.full_name, p_sender.email, 'Unknown') AS sender_name,
    p_sender.avatar_url AS sender_avatar
  FROM public.messages m
  INNER JOIN public.conversation_members cm 
    ON cm.conversation_id = m.conversation_id AND cm.user_id = auth.uid()
  INNER JOIN public.conversations c 
    ON c.id = m.conversation_id
  LEFT JOIN public.profiles p_sender 
    ON p_sender.id = m.sender_id
  LEFT JOIN LATERAL (
    SELECT p2.full_name, p2.email
    FROM public.conversation_members cm2
    INNER JOIN public.profiles p2 ON p2.id = cm2.user_id
    WHERE cm2.conversation_id = m.conversation_id 
      AND cm2.user_id != auth.uid()
    LIMIT 1
  ) p_other ON NOT c.is_group
  WHERE m.content ILIKE '%' || trim(search_query) || '%'
    AND m.deleted_at IS NULL
  ORDER BY m.created_at DESC
  LIMIT max_results;
END;
$$;
