-- Per-fan churn signals from background Churn Predictor runs (for inbox + profile).
CREATE TABLE IF NOT EXISTS public.fan_churn_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL REFERENCES public.fans(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('onlyfans', 'fansly')),
  platform_fan_id TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'unknown'
    CHECK (risk_level IN ('low', 'medium', 'high', 'critical', 'unknown')),
  one_line TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, fan_id)
);

CREATE INDEX IF NOT EXISTS idx_fan_churn_snapshots_user_platform_fan
  ON public.fan_churn_snapshots (user_id, platform, platform_fan_id);

COMMENT ON TABLE public.fan_churn_snapshots IS 'Latest churn risk line per CRM fan from Circe Churn background digest JSON.';

ALTER TABLE public.fan_churn_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fan_churn_snapshots_select_own" ON public.fan_churn_snapshots;
DROP POLICY IF EXISTS "fan_churn_snapshots_insert_own" ON public.fan_churn_snapshots;
DROP POLICY IF EXISTS "fan_churn_snapshots_update_own" ON public.fan_churn_snapshots;
DROP POLICY IF EXISTS "fan_churn_snapshots_delete_own" ON public.fan_churn_snapshots;

CREATE POLICY "fan_churn_snapshots_select_own" ON public.fan_churn_snapshots
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fan_churn_snapshots_insert_own" ON public.fan_churn_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fan_churn_snapshots_update_own" ON public.fan_churn_snapshots
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "fan_churn_snapshots_delete_own" ON public.fan_churn_snapshots
  FOR DELETE USING (auth.uid() = user_id);

-- Workflow hooks (optional toggles on hub)
ALTER TABLE public.circe_churn_settings
  ADD COLUMN IF NOT EXISTS link_divine_manager_tasks BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.circe_churn_settings
  ADD COLUMN IF NOT EXISTS link_protocol_tasks BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.circe_churn_settings.link_divine_manager_tasks IS 'When true, background run creates a divine_manager_tasks row for the digest.';
COMMENT ON COLUMN public.circe_churn_settings.link_protocol_tasks IS 'When true, background run creates a creator_protocol_tasks row for follow-up.';
