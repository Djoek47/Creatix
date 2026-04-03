-- Circe Churn Predictor: background retention scans (CRM + optional thread context), digest notifications.
CREATE TABLE IF NOT EXISTS public.circe_churn_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  run_cadence TEXT NOT NULL DEFAULT 'off'
    CHECK (run_cadence IN ('off', 'daily', 'weekly')),
  run_hour_utc SMALLINT NOT NULL DEFAULT 9
    CHECK (run_hour_utc >= 0 AND run_hour_utc <= 23),
  expiring_within_days INTEGER NOT NULL DEFAULT 14
    CHECK (expiring_within_days >= 1 AND expiring_within_days <= 90),
  stale_interaction_days INTEGER NOT NULL DEFAULT 10
    CHECK (stale_interaction_days >= 3 AND stale_interaction_days <= 60),
  include_stale_active BOOLEAN NOT NULL DEFAULT TRUE,
  max_fans_per_run INTEGER NOT NULL DEFAULT 6
    CHECK (max_fans_per_run >= 1 AND max_fans_per_run <= 25),
  notify_on_run_summary BOOLEAN NOT NULL DEFAULT TRUE,
  notify_when_empty BOOLEAN NOT NULL DEFAULT FALSE,
  credits_per_run INTEGER NOT NULL DEFAULT 2
    CHECK (credits_per_run >= 1 AND credits_per_run <= 10),
  last_run_at TIMESTAMPTZ,
  last_run_error TEXT,
  last_digest_excerpt TEXT,
  last_digest_markdown TEXT,
  last_digest_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_circe_churn_settings_enabled
  ON public.circe_churn_settings (enabled)
  WHERE enabled = TRUE;

COMMENT ON TABLE public.circe_churn_settings IS 'Churn Predictor: scheduled CRM-based retention digests (Pro; consumes AI credits per run).';

ALTER TABLE public.circe_churn_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "circe_churn_settings_select_own" ON public.circe_churn_settings;
DROP POLICY IF EXISTS "circe_churn_settings_update_own" ON public.circe_churn_settings;
DROP POLICY IF EXISTS "circe_churn_settings_insert_own" ON public.circe_churn_settings;

CREATE POLICY "circe_churn_settings_select_own" ON public.circe_churn_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "circe_churn_settings_insert_own" ON public.circe_churn_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "circe_churn_settings_update_own" ON public.circe_churn_settings
  FOR UPDATE USING (auth.uid() = user_id);
