-- CRM profile intelligence upgrade:
-- - expand manual override types
-- - track enrichment provenance for platform_about

ALTER TABLE public.fans
  ADD COLUMN IF NOT EXISTS platform_about_source TEXT;

ALTER TABLE public.fans
  ADD COLUMN IF NOT EXISTS platform_about_refreshed_at TIMESTAMPTZ;

ALTER TABLE public.fans
  DROP CONSTRAINT IF EXISTS fans_audience_profile_override_check;

ALTER TABLE public.fans
  ADD CONSTRAINT fans_audience_profile_override_check
  CHECK (
    audience_profile_override IS NULL
    OR audience_profile_override IN (
      'fan',
      'whale',
      'creator',
      'paying_creator',
      'advertisement',
      'freeloader'
    )
  );

ALTER TABLE public.fans
  DROP CONSTRAINT IF EXISTS fans_platform_about_source_check;

ALTER TABLE public.fans
  ADD CONSTRAINT fans_platform_about_source_check
  CHECK (platform_about_source IS NULL OR platform_about_source IN ('of_api', 'serper'));

COMMENT ON COLUMN public.fans.audience_profile_override IS
  'Explicit CRM profile type override. Null lets the deterministic profile engine evolve from spend + thread context.';

COMMENT ON COLUMN public.fans.platform_about_source IS
  'Origin of platform_about enrichment: of_api (native fan endpoint) or serper fallback.';

COMMENT ON COLUMN public.fans.platform_about_refreshed_at IS
  'Last enrichment run timestamp, used to cache/freshness checks for profile-about retrieval.';

NOTIFY pgrst, 'reload schema';
