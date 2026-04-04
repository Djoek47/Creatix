-- Seat-based billing: each seat = one manager login for the same creator account (Stripe line quantity).
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_seats INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.subscriptions.billing_seats IS 'Number of paid seats (managers); price per month = plan line × seats (app clamps 1–50).';
