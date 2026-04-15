-- Private bucket for vault video files (Frame exports + manual replace).
-- Run in Supabase SQL Editor after 074. Service role uploads from API bypass RLS.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('vault-media', 'vault-media', false, 524288000)
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit;

-- Authenticated users can read their own objects (optional; app mostly uses signed URLs from service role).
DROP POLICY IF EXISTS "vault_media_select_own" ON storage.objects;
CREATE POLICY "vault_media_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'vault-media'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
