-- Subscription period end from platform sync (OnlyFans expiresAt, Fansly expiresAt).
-- Safe to re-run.

ALTER TABLE public.fans
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

ALTER TABLE public.fans
  ADD COLUMN IF NOT EXISTS subscription_renews_on TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_fans_user_subscription_expires
  ON public.fans (user_id, subscription_expires_at)
  WHERE subscription_status = 'active' AND subscription_expires_at IS NOT NULL;

COMMENT ON COLUMN public.fans.subscription_expires_at IS 'Current subscription period end from platform API sync (active subs).';
COMMENT ON COLUMN public.fans.subscription_renews_on IS 'Optional next renewal timestamp from platform when provided.';
