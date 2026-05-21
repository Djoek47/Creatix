-- OnlyFans webhook idempotency ledger.
-- Ensures duplicate deliveries are ignored safely and processing status is traceable.

CREATE TABLE IF NOT EXISTS public.platform_webhook_event_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL CHECK (platform IN ('onlyfans')),
  event_type text NOT NULL,
  event_id text NOT NULL,
  payload_hash text NOT NULL,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed')),
  error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_webhook_event_ledger_unique
  ON public.platform_webhook_event_ledger (platform, event_id);

CREATE INDEX IF NOT EXISTS idx_platform_webhook_event_ledger_status
  ON public.platform_webhook_event_ledger (platform, status, received_at DESC);
