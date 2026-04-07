-- Pause automatic Stripe tier alignment (cron) until a timestamp — support / manual override.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS revenue_tier_sync_paused_until TIMESTAMPTZ;

COMMENT ON COLUMN public.subscriptions.revenue_tier_sync_paused_until IS
  'When set and in the future, GET /api/cron/revenue-tier-stripe-align skips this user. Cleared by admin or support.';
