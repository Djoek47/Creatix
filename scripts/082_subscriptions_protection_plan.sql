-- Protection & Anti-Piracy add-on: separate Stripe subscription id from main `cev-paid` (`stripe_subscription_id`).
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS protection_stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS protection_plan_active BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.subscriptions.protection_stripe_subscription_id IS
  'Stripe subscription id for cev-protection ($25/mo); distinct from main stripe_subscription_id';
COMMENT ON COLUMN public.subscriptions.protection_plan_active IS
  'True when protection subscription is active or trialing';

CREATE INDEX IF NOT EXISTS idx_subscriptions_protection_stripe
  ON public.subscriptions (protection_stripe_subscription_id)
  WHERE protection_stripe_subscription_id IS NOT NULL;
