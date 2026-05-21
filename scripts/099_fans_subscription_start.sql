-- Platform-reported subscription start (OnlyFans/Fansly sync payloads).
-- `first_subscribed_at` exists from 001; this column aligns with CRM upserts that send subscription_start.
ALTER TABLE public.fans ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMPTZ;

COMMENT ON COLUMN public.fans.subscription_start IS 'Subscription/start date from platform API (paired with first_subscribed_at where both exist).';
