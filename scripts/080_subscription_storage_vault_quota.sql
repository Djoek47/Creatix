-- Align public.subscriptions.storage_limit_mb with the app-enforced vault quota (256 MB).
-- See lib/billing/app-storage-cap.ts and lib/frame-vault-media.ts (VAULT_USER_QUOTA_MB).

ALTER TABLE public.subscriptions
  ALTER COLUMN storage_limit_mb SET DEFAULT 256;

UPDATE public.subscriptions
SET storage_limit_mb = 256,
    updated_at = now()
WHERE storage_limit_mb IS NULL OR storage_limit_mb > 256;
