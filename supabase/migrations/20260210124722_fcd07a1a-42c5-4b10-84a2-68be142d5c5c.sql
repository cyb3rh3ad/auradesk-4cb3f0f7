
-- Create chat-files storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to their conversation folders
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-files');

-- Allow anyone to read chat files (public bucket)
CREATE POLICY "Chat files are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-files');

-- Allow users to delete their own uploaded files
CREATE POLICY "Users can delete their own chat files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[2]);
