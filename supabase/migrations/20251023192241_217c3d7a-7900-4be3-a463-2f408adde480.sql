-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
);

-- RLS policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create storage bucket for meeting summaries
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'meeting-summaries',
  'meeting-summaries',
  false,
  10485760, -- 10MB limit
  ARRAY['text/plain', 'text/markdown', 'application/pdf']
);

-- RLS policies for meeting summaries bucket
CREATE POLICY "Users can view summaries of their meetings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'meeting-summaries' AND
  auth.uid() IN (
    SELECT mp.user_id 
    FROM public.meeting_participants mp
    JOIN public.meetings m ON m.id = mp.meeting_id
    WHERE (storage.foldername(name))[1] = m.id::text
  )
);

CREATE POLICY "Meeting participants can upload summaries"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'meeting-summaries' AND
  auth.uid() IN (
    SELECT mp.user_id 
    FROM public.meeting_participants mp
    JOIN public.meetings m ON m.id = mp.meeting_id
    WHERE (storage.foldername(name))[1] = m.id::text
  )
);