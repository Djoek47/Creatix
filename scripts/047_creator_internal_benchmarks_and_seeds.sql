-- Anonymized in-app cohort stats for Competitor Analysis (no per-creator PII in this table).
-- Populated by service-role cron from CRM `fans` + `platform_connections` niches.
-- Optional: `comparison_serper_seed_profiles` holds public handles you will bulk-load for future Serper enrichment.

-- Aggregate fan counts per creator per platform (internal use only; not exposed to PostgREST clients).
CREATE OR REPLACE FUNCTION public.internal_creator_crm_fan_counts()
RETURNS TABLE (user_id UUID, platform TEXT, fan_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.user_id, f.platform, count(*)::bigint
  FROM public.fans f
  GROUP BY f.user_id, f.platform;
$$;

REVOKE ALL ON FUNCTION public.internal_creator_crm_fan_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.internal_creator_crm_fan_counts() TO service_role;

COMMENT ON FUNCTION public.internal_creator_crm_fan_counts IS
  'Returns per-creator per-platform fan row counts for benchmark aggregation. Callable only with service_role.';

CREATE TABLE IF NOT EXISTS public.creator_internal_benchmarks (
  platform TEXT NOT NULL CHECK (platform IN ('onlyfans', 'fansly', 'mym', 'all')),
  niche_bucket TEXT NOT NULL,
  creator_count INTEGER NOT NULL CHECK (creator_count >= 0),
  fan_count_p25 INTEGER,
  fan_count_p50 INTEGER,
  fan_count_p75 INTEGER,
  fan_count_mean NUMERIC,
  dataset_creator_total INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (platform, niche_bucket)
);

CREATE INDEX IF NOT EXISTS idx_creator_internal_benchmarks_computed
  ON public.creator_internal_benchmarks (computed_at DESC);

COMMENT ON TABLE public.creator_internal_benchmarks IS
  'Anonymized percentile summaries of imported fan counts by platform + niche bucket. Refreshed by cron; used in Competitor Analysis when cohort is large enough.';

ALTER TABLE public.creator_internal_benchmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creator_internal_benchmarks_select_auth ON public.creator_internal_benchmarks;

CREATE POLICY creator_internal_benchmarks_select_auth ON public.creator_internal_benchmarks
  FOR SELECT TO authenticated
  USING (true);

-- Curated public handles for future Serper-based corpus (bulk INSERT when ready). No Creatix user_id stored here.
CREATE TABLE IF NOT EXISTS public.comparison_serper_seed_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('onlyfans', 'fansly', 'mym', 'twitter', 'instagram', 'tiktok', 'other')),
  public_handle TEXT NOT NULL,
  niche_hint TEXT,
  region_hint TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS comparison_serper_seed_profiles_plat_handle_lower
  ON public.comparison_serper_seed_profiles (platform, lower(trim(public_handle)));

COMMENT ON TABLE public.comparison_serper_seed_profiles IS
  'Optional list of public creator handles for future Serper enrichment / benchmark expansion. Load via SQL or admin; not linked to Creatix accounts.';

ALTER TABLE public.comparison_serper_seed_profiles ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT policies: service_role and postgres bypass RLS for maintenance jobs.

-- Bulk-load ~1000 public handles via SQL editor or COPY into comparison_serper_seed_profiles
-- (platform, public_handle, niche_hint, is_active). Duplicate (platform, lower(handle)) is rejected by the unique index.
-- Future: optional Serper enrichment job can read is_active rows (not wired yet).
