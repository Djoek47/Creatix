-- Private bucket for vault video exports / replacements (Frame bridge).
-- Create bucket in Dashboard → Storage, or use SQL API; policies allow service role + signed URLs from app.

-- Optional: add column to re-sign without relying on long-lived signed URLs in file_url alone.
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS vault_storage_path text;

COMMENT ON COLUMN public.content.vault_storage_path IS
  'Object path inside vault-media bucket (e.g. userId/contentId/file.mp4). When set, app can refresh signed URLs; file_url may still hold external CDN URLs.';
