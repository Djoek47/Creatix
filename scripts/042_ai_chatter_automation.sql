-- AI Chatter: per-fan automation (Mimic + thread + optional vault context)
-- Run after fans / fan_thread_insights exist.

CREATE TABLE IF NOT EXISTS public.ai_chatter_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'onlyfans' CHECK (platform IN ('onlyfans', 'fansly')),
  fan_id UUID NOT NULL REFERENCES public.fans(id) ON DELETE CASCADE,
  platform_fan_id TEXT NOT NULL,
  fan_username TEXT,
  status TEXT NOT NULL DEFAULT 'draft_setup' CHECK (status IN ('draft_setup', 'active', 'paused')),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  beta_acknowledged_at TIMESTAMPTZ,
  last_processed_at TIMESTAMPTZ,
  last_processed_message_id TEXT,
  replies_today INTEGER NOT NULL DEFAULT 0,
  replies_day_utc TEXT,
  last_outbound_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform, fan_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_chatter_automations_user
  ON public.ai_chatter_automations (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chatter_automations_active
  ON public.ai_chatter_automations (user_id, status)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.ai_chatter_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.ai_chatter_automations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chatter_events_automation
  ON public.ai_chatter_events (automation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_chatter_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.ai_chatter_automations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'onlyfans',
  platform_fan_id TEXT NOT NULL,
  draft_text TEXT NOT NULL,
  inbound_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chatter_outbox_user_pending
  ON public.ai_chatter_outbox (user_id, status)
  WHERE status = 'pending';

ALTER TABLE public.ai_chatter_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chatter_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chatter_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_chatter_automations_own ON public.ai_chatter_automations;
CREATE POLICY ai_chatter_automations_own ON public.ai_chatter_automations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_chatter_events_own ON public.ai_chatter_events;
CREATE POLICY ai_chatter_events_own ON public.ai_chatter_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_chatter_outbox_own ON public.ai_chatter_outbox;
CREATE POLICY ai_chatter_outbox_own ON public.ai_chatter_outbox
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.ai_chatter_automations IS 'Per-fan AI Chatter automation config (OnlyFans-first).';
COMMENT ON COLUMN public.ai_chatter_automations.settings IS 'send_mode, caps, keywords, bypass_mimic_review_gate, etc.';
COMMENT ON TABLE public.ai_chatter_outbox IS 'Queue/review drafts before creator sends from Messages.';
