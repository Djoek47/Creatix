-- Dashboard presence + meaningful interaction telemetry for Flow v2 (heartbeat rate-limit + daily action bucket in UTC).
CREATE TABLE IF NOT EXISTS public.user_wellbeing_activity (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_heartbeat_at TIMESTAMPTZ,
  last_meaningful_action_at TIMESTAMPTZ,
  actions_bucket_date DATE,
  meaningful_actions_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_wellbeing_activity_updated_at ON public.user_wellbeing_activity (updated_at DESC);

COMMENT ON TABLE public.user_wellbeing_activity IS 'Per-user wellbeing telemetry: last heartbeat, meaningful UI actions, UTC daily counter for Flow presence signals.';

ALTER TABLE public.user_wellbeing_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_wellbeing_activity_select_own" ON public.user_wellbeing_activity;
DROP POLICY IF EXISTS "user_wellbeing_activity_insert_own" ON public.user_wellbeing_activity;
DROP POLICY IF EXISTS "user_wellbeing_activity_update_own" ON public.user_wellbeing_activity;

CREATE POLICY "user_wellbeing_activity_select_own" ON public.user_wellbeing_activity
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_wellbeing_activity_insert_own" ON public.user_wellbeing_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_wellbeing_activity_update_own" ON public.user_wellbeing_activity
  FOR UPDATE USING (auth.uid() = user_id);
