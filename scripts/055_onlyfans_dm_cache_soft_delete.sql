-- Keep DM cache rows when OnlyFans removes a message; soft-mark instead of deleting.
-- After each tail sync, messages in the same time window as the API batch but missing
-- from the response are marked removed_from_platform_at (fan/creator delete on OF).

ALTER TABLE public.onlyfans_dm_message_cache
  ADD COLUMN IF NOT EXISTS removed_from_platform_at TIMESTAMPTZ;

COMMENT ON COLUMN public.onlyfans_dm_message_cache.removed_from_platform_at IS
  'Set when a cached message no longer appears in the latest OnlyFans tail fetch for its time window; row and payload are retained.';

CREATE INDEX IF NOT EXISTS idx_of_dm_cache_user_fan_removed_time
  ON public.onlyfans_dm_message_cache (user_id, platform_fan_id, message_created_at DESC)
  WHERE removed_from_platform_at IS NULL;

-- Invoked as the authenticated user (RLS applies). Only updates rows for the given fan.
CREATE OR REPLACE FUNCTION public.mark_onlyfans_dm_removed_if_missing_from_tail(
  p_user_id uuid,
  p_platform_fan_id text,
  p_api_message_ids text[],
  p_oldest_visible_on_platform timestamptz
) RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.onlyfans_dm_message_cache c
  SET
    removed_from_platform_at = NOW(),
    synced_at = NOW()
  WHERE c.user_id = p_user_id
    AND c.platform_fan_id = p_platform_fan_id
    AND c.removed_from_platform_at IS NULL
    AND c.message_created_at >= p_oldest_visible_on_platform
    AND NOT (c.onlyfans_message_id = ANY (COALESCE(p_api_message_ids, ARRAY[]::text[])));
$$;

COMMENT ON FUNCTION public.mark_onlyfans_dm_removed_if_missing_from_tail IS
  'Marks cache rows in the current API tail window as removed on platform when their id is absent from the latest fetch.';

GRANT EXECUTE ON FUNCTION public.mark_onlyfans_dm_removed_if_missing_from_tail(uuid, text, text[], timestamptz) TO authenticated;
