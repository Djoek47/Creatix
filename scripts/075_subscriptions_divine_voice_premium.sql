-- Premium Divine Voice + comms: Stripe metadata / price-id gates (see lib/billing/premium-divine.ts).
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS divine_voice_premium boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.subscriptions.divine_voice_premium IS
  'User purchased Divine Voice (Realtime + TTS) and premium messaging tier. Set from Stripe metadata divineVoicePremium=1 and/or a matching Stripe price id.';

CREATE INDEX IF NOT EXISTS idx_subscriptions_divine_voice_premium
  ON public.subscriptions (user_id) WHERE divine_voice_premium = true;
