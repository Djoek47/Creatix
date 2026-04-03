-- Add 'scam' to leak_alerts.status for paywall bait, fake tasks, upsell traps (not real infringement).
ALTER TABLE public.leak_alerts DROP CONSTRAINT IF EXISTS leak_alerts_status_check;

ALTER TABLE public.leak_alerts
  ADD CONSTRAINT leak_alerts_status_check
  CHECK (status IN (
    'pending','reviewed','confirmed','ignored','dmca_sent',
    'detected','reviewing','resolved','false_positive','scam'
  ));

COMMENT ON COLUMN public.leak_alerts.status IS
  'Pipeline: detected/reviewing/pending = active queue; resolved/false_positive/scam/dmca_sent/ignored = archived outcomes.';
