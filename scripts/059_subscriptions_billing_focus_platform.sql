-- Focus plan: which adult platform the single-platform subscription covers (null = Unified / multi)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_focus_platform TEXT;

COMMENT ON COLUMN public.subscriptions.billing_focus_platform IS
  'Focus (single) plan: onlyfans | fansly | manyvids. NULL when billing_variant is multi (Unified).';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscriptions_billing_focus_platform_valid'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_billing_focus_platform_valid
      CHECK (
        billing_focus_platform IS NULL
        OR billing_focus_platform IN ('onlyfans', 'fansly', 'manyvids')
      );
  END IF;
END $$;

UPDATE public.subscriptions
SET billing_focus_platform = 'onlyfans'
WHERE billing_variant = 'single'
  AND (billing_focus_platform IS NULL OR billing_focus_platform = '');

UPDATE public.subscriptions
SET billing_focus_platform = NULL
WHERE billing_variant = 'multi';
