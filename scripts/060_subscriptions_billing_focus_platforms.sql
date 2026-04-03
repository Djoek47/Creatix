-- Focus plan: 1–2 adult platforms (canonical sorted array). Unified = NULL.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_focus_platforms text[];

COMMENT ON COLUMN public.subscriptions.billing_focus_platforms IS
  'Focus (single): 1–2 of onlyfans, fansly, manyvids. NULL for Unified (multi).';

-- Default single-plan rows missing array to OnlyFans, then copy legacy scalar when set
UPDATE public.subscriptions
SET billing_focus_platforms = ARRAY['onlyfans']::text[]
WHERE billing_variant = 'single'
  AND (billing_focus_platforms IS NULL OR cardinality(billing_focus_platforms) = 0)
  AND (
    billing_focus_platform IS NULL
    OR trim(billing_focus_platform) = ''
  );

UPDATE public.subscriptions
SET billing_focus_platforms = ARRAY[billing_focus_platform]::text[]
WHERE billing_variant = 'single'
  AND billing_focus_platform IN ('onlyfans', 'fansly', 'manyvids');

UPDATE public.subscriptions
SET billing_focus_platforms = NULL
WHERE billing_variant = 'multi';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_billing_focus_platforms_cardinality'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_billing_focus_platforms_cardinality
      CHECK (
        billing_variant IS DISTINCT FROM 'single'
        OR billing_focus_platforms IS NULL
        OR (
          array_length(billing_focus_platforms, 1) IS NOT NULL
          AND array_length(billing_focus_platforms, 1) >= 1
          AND array_length(billing_focus_platforms, 1) <= 2
        )
      );
  END IF;
END $$;
