-- Circe's Aegis: per-creator settings for scheduled leak scans and optional auto-draft DMCA.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.circe_aegis_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  scan_cadence TEXT NOT NULL DEFAULT 'off'
    CHECK (scan_cadence IN ('off', 'daily', 'weekly')),
  scan_hour_utc SMALLINT NOT NULL DEFAULT 6
    CHECK (scan_hour_utc >= 0 AND scan_hour_utc <= 23),
  leak_scan_strict BOOLEAN NOT NULL DEFAULT TRUE,
  include_content_titles BOOLEAN NOT NULL DEFAULT TRUE,
  last_leak_scan_at TIMESTAMPTZ,
  last_leak_scan_error TEXT,
  auto_dmca_draft_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  auto_dmca_min_severity TEXT NOT NULL DEFAULT 'high'
    CHECK (auto_dmca_min_severity IN ('high', 'critical')),
  auto_dmca_require_page_verified BOOLEAN NOT NULL DEFAULT FALSE,
  auto_dmca_max_per_run INTEGER NOT NULL DEFAULT 5
    CHECK (auto_dmca_max_per_run >= 0 AND auto_dmca_max_per_run <= 50),
  last_auto_dmca_at TIMESTAMPTZ,
  notify_on_scan_summary BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_new_leak BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_auto_draft BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_circe_aegis_settings_enabled
  ON public.circe_aegis_settings (enabled)
  WHERE enabled = TRUE;

COMMENT ON TABLE public.circe_aegis_settings IS 'Circe Aegis: background leak scan cadence and optional DMCA draft automation (review before send).';

ALTER TABLE public.circe_aegis_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "circe_aegis_settings_select_own" ON public.circe_aegis_settings;
DROP POLICY IF EXISTS "circe_aegis_settings_update_own" ON public.circe_aegis_settings;
DROP POLICY IF EXISTS "circe_aegis_settings_insert_own" ON public.circe_aegis_settings;

CREATE POLICY "circe_aegis_settings_select_own" ON public.circe_aegis_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "circe_aegis_settings_insert_own" ON public.circe_aegis_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "circe_aegis_settings_update_own" ON public.circe_aegis_settings
  FOR UPDATE USING (auth.uid() = user_id);
