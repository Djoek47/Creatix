-- Persist OnlyFans DM payloads per creator + fan so /api/onlyfans/messages can return quickly
-- when OnlyFans is slow or rate-limited; background refresh updates rows via upsert.

CREATE TABLE IF NOT EXISTS public.onlyfans_dm_message_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform_fan_id TEXT NOT NULL,
  onlyfans_message_id TEXT NOT NULL,
  message_created_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, platform_fan_id, onlyfans_message_id)
);

CREATE INDEX IF NOT EXISTS idx_of_dm_cache_user_fan_time
  ON public.onlyfans_dm_message_cache (user_id, platform_fan_id, message_created_at DESC);

ALTER TABLE public.onlyfans_dm_message_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "of_dm_cache_select_own"
  ON public.onlyfans_dm_message_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "of_dm_cache_insert_own"
  ON public.onlyfans_dm_message_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "of_dm_cache_update_own"
  ON public.onlyfans_dm_message_cache FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "of_dm_cache_delete_own"
  ON public.onlyfans_dm_message_cache FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.onlyfans_dm_message_cache IS
  'Cached OnlyFans chat messages (JSON payloads) for fast inbox thread load and offline tolerance.';
