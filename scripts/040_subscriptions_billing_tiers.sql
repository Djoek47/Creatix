-- Revenue-tier billing: Single vs Multi + tier index (0–10)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_variant TEXT CHECK (billing_variant IS NULL OR billing_variant IN ('single', 'multi')),
  ADD COLUMN IF NOT EXISTS revenue_tier SMALLINT CHECK (revenue_tier IS NULL OR (revenue_tier >= 0 AND revenue_tier <= 10)),
  ADD COLUMN IF NOT EXISTS revenue_band_label TEXT,
  ADD COLUMN IF NOT EXISTS revenue_self_reported_at TIMESTAMPTZ;

COMMENT ON COLUMN public.subscriptions.billing_variant IS 'single = OnlyFans-only; multi = OF + other adult platforms';
COMMENT ON COLUMN public.subscriptions.revenue_tier IS '0–10 index matching lib/pricing-matrix REVENUE_TIERS';
COMMENT ON COLUMN public.subscriptions.revenue_band_label IS 'Cached label e.g. Under $1,000 for support UI';

-- Grandfather existing paid rows: keep plan_id, set tier defaults where missing (optional one-time backfill)
UPDATE public.subscriptions
SET
  plan_id = CASE
    WHEN lower(plan_id) IN ('venus-pro', 'circe-elite', 'divine-duo') THEN 'cev-paid'
    ELSE plan_id
  END,
  billing_variant = COALESCE(billing_variant, 'multi'),
  revenue_tier = COALESCE(revenue_tier, 4),
  revenue_band_label = COALESCE(revenue_band_label, '$10k – $15k')
WHERE lower(plan_id) IN ('venus-pro', 'circe-elite', 'divine-duo')
  AND (billing_variant IS NULL OR revenue_tier IS NULL);
