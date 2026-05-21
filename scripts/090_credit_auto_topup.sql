-- Automatic credit top-up: user settings + optional event log (Stripe off-session PaymentIntents).
-- Run in Supabase SQL editor or your migration pipeline.

CREATE TABLE IF NOT EXISTS public.credit_auto_topup_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  threshold_credits INTEGER NOT NULL DEFAULT 10000
    CHECK (threshold_credits >= 500 AND threshold_credits <= 5000000),
  pack_id TEXT NOT NULL DEFAULT 'credit-topup-2000'
    CHECK (pack_id IN ('credit-topup-2000', 'credit-topup-5000', 'credit-topup-10000')),
  monthly_max_usd_cents INTEGER NOT NULL DEFAULT 50000
    CHECK (monthly_max_usd_cents >= 500 AND monthly_max_usd_cents <= 5000000),
  cooldown_minutes INTEGER NOT NULL DEFAULT 360
    CHECK (cooldown_minutes >= 30 AND cooldown_minutes <= 10080),
  monthly_spent_usd_cents INTEGER NOT NULL DEFAULT 0
    CHECK (monthly_spent_usd_cents >= 0),
  monthly_window_start TIMESTAMPTZ NOT NULL DEFAULT (DATE_TRUNC('month', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'),
  last_attempt_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_payment_intent_id TEXT,
  last_error TEXT,
  status TEXT NOT NULL DEFAULT 'disabled_by_user'
    CHECK (status IN ('active', 'paused', 'needs_payment_method', 'requires_action', 'disabled_by_user')),
  consecutive_failures SMALLINT NOT NULL DEFAULT 0
    CHECK (consecutive_failures >= 0 AND consecutive_failures <= 50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_auto_topup_settings_enabled_active
  ON public.credit_auto_topup_settings (enabled, status)
  WHERE enabled = TRUE AND status IN ('active', 'needs_payment_method');

COMMENT ON TABLE public.credit_auto_topup_settings IS 'Auto top-up when wallet totalRemaining <= threshold; Stripe off-session PI + webhook grant.';

CREATE TABLE IF NOT EXISTS public.credit_auto_topup_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('attempt', 'success', 'failure')),
  payment_intent_id TEXT,
  amount_usd_cents INTEGER,
  credits INTEGER,
  pack_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_auto_topup_events_user_created
  ON public.credit_auto_topup_events (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_auto_topup_events_pi_unique
  ON public.credit_auto_topup_events (payment_intent_id)
  WHERE payment_intent_id IS NOT NULL;

COMMENT ON TABLE public.credit_auto_topup_events IS 'Audit trail for automatic credit top-ups (support / debugging).';

ALTER TABLE public.credit_auto_topup_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_auto_topup_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credit_auto_topup_settings_select_own" ON public.credit_auto_topup_settings;
DROP POLICY IF EXISTS "credit_auto_topup_settings_insert_own" ON public.credit_auto_topup_settings;
DROP POLICY IF EXISTS "credit_auto_topup_settings_update_own" ON public.credit_auto_topup_settings;

CREATE POLICY "credit_auto_topup_settings_select_own" ON public.credit_auto_topup_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "credit_auto_topup_settings_insert_own" ON public.credit_auto_topup_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "credit_auto_topup_settings_update_own" ON public.credit_auto_topup_settings
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "credit_auto_topup_events_select_own" ON public.credit_auto_topup_events;

CREATE POLICY "credit_auto_topup_events_select_own" ON public.credit_auto_topup_events
  FOR SELECT USING (auth.uid() = user_id);
