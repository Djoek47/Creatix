-- Fan CRM + OnlyFans webhook alignment: upsert key, optional columns, increment RPC
-- Run after prior migrations. Safe to re-run (IF NOT EXISTS / OR REPLACE).

-- ---------------------------------------------------------------------------
-- 1) Columns referenced by app / webhooks but missing from base schema
-- ---------------------------------------------------------------------------
ALTER TABLE public.fans
  ADD COLUMN IF NOT EXISTS subscription_price NUMERIC(12, 2);

ALTER TABLE public.fans
  ADD COLUMN IF NOT EXISTS is_renewing BOOLEAN DEFAULT TRUE;

ALTER TABLE public.fans
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE public.fans
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.fans
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.fans.subscription_price IS 'Last known subscription price from platform webhook (USD).';
COMMENT ON COLUMN public.fans.is_renewing IS 'Whether subscription is currently renewing (OnlyFans-style webhooks).';
COMMENT ON COLUMN public.fans.expires_at IS 'When subscription ended or is set to expire.';
COMMENT ON COLUMN public.fans.is_favorite IS 'Creator CRM flag.';
COMMENT ON COLUMN public.fans.is_blocked IS 'Creator CRM flag.';

-- ---------------------------------------------------------------------------
-- 2) Stable identity for upsert: one row per (creator, platform, upstream fan id)
-- ---------------------------------------------------------------------------
-- Legacy rows may have NULL platform_fan_id (manual CRM). Give them a deterministic surrogate.
UPDATE public.fans
SET platform_fan_id = 'local:' || id::text
WHERE platform_fan_id IS NULL OR trim(platform_fan_id) = '';

-- If this fails, dedupe duplicate (user_id, platform, platform_fan_id) rows manually first.
ALTER TABLE public.fans
  ALTER COLUMN platform_fan_id SET NOT NULL;

DROP INDEX IF EXISTS public.fans_user_platform_fan_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS fans_user_platform_fan_uidx
  ON public.fans (user_id, platform, platform_fan_id);

-- ---------------------------------------------------------------------------
-- 3) RPC used by OnlyFans webhooks (tips, purchases, spending events)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_fan_spending(
  p_user_id uuid,
  p_fan_id text,
  p_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.fans
  SET
    total_spent = COALESCE(total_spent, 0) + p_amount,
    subscription_tier = CASE
      WHEN COALESCE(total_spent, 0) + p_amount >= 500 THEN 'vip'
      WHEN COALESCE(total_spent, 0) + p_amount >= 100 THEN 'whale'
      ELSE COALESCE(subscription_tier, 'regular')
    END,
    last_interaction_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND platform = 'onlyfans'
    AND platform_fan_id = p_fan_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_fan_spending(uuid, text, numeric) FROM PUBLIC;
-- Webhooks use the service role key; do not expose to anon/authenticated clients.
GRANT EXECUTE ON FUNCTION public.increment_fan_spending(uuid, text, numeric) TO service_role;
