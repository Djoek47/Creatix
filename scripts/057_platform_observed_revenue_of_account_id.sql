-- Tie observed monthly revenue to the specific OnlyFans API account id (access_token),
-- so switching to another OF account under the same user does not reuse the previous account's signal.
ALTER TABLE public.platform_connections
  ADD COLUMN IF NOT EXISTS observed_revenue_onlyfans_account_id TEXT;

COMMENT ON COLUMN public.platform_connections.observed_revenue_onlyfans_account_id IS
  'Partner API account id this row’s observed_monthly_revenue_usd applies to (OnlyFans or Fansly access_token / account id); must match the currently connected id for billing enforcement.';

-- Best-effort: legacy rows (column was missing) — assume stored revenue matches the current connected account.
UPDATE public.platform_connections
SET observed_revenue_onlyfans_account_id = access_token
WHERE platform = 'onlyfans'
  AND observed_monthly_revenue_usd IS NOT NULL
  AND access_token IS NOT NULL
  AND observed_revenue_onlyfans_account_id IS NULL;
