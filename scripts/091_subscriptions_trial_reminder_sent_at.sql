-- 091: Track one-shot in-app reminder (~24h before Divine trial ends).

BEGIN;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_expiry_reminder_sent_at timestamptz NULL;

COMMENT ON COLUMN public.subscriptions.trial_expiry_reminder_sent_at IS
  'Set when user received in-app "trial ends in ~24h" notification (cron idempotency).';

COMMIT;
