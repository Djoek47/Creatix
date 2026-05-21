-- Bump per-subscriber vault/storage limit default from 256 MB to 3072 MB (3 GB).
-- Aligns DB `storage_limit_mb` with lib/billing/app-storage-cap.ts (APP_USER_STORAGE_LIMIT_MB) and Stripe merge.
-- Run once in Supabase SQL Editor after deploying app code (and after previous migration 080 if applicable).

ALTER TABLE public.subscriptions
  ALTER COLUMN storage_limit_mb SET DEFAULT 3072;

-- Raise rows below the new ceiling; preserves values >= 3072 MB (unexpected custom overrides stay intact).
UPDATE public.subscriptions
SET storage_limit_mb = 3072,
    updated_at = now()
WHERE storage_limit_mb IS NULL
   OR storage_limit_mb < 3072;

