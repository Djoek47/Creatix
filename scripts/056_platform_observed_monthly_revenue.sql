-- Signals from connected platforms for revenue-tier enforcement (OnlyFans monthly estimate).
ALTER TABLE public.platform_connections
  ADD COLUMN IF NOT EXISTS observed_monthly_revenue_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS observed_revenue_captured_at TIMESTAMPTZ;

COMMENT ON COLUMN public.platform_connections.observed_monthly_revenue_usd IS
  'Best-effort monthly revenue (USD) from platform API at last sync/callback; used to ensure subscribed revenue_tier is not below observed band.';
COMMENT ON COLUMN public.platform_connections.observed_revenue_captured_at IS
  'When observed_monthly_revenue_usd was last written.';
