-- Trial credit bank: when users lose trialing/active eligibility, unused *trial* included
-- credits are banked (not purchased). On first paid/protection monthly grant, banked + any
-- live trial remainder roll into the included bucket only.

BEGIN;

ALTER TABLE public.credit_wallets
  ADD COLUMN IF NOT EXISTS banked_trial_credits INTEGER NOT NULL DEFAULT 0
  CHECK (banked_trial_credits >= 0);

ALTER TABLE public.credit_wallets
  ADD COLUMN IF NOT EXISTS included_grant_plan_kind TEXT
  CHECK (
    included_grant_plan_kind IS NULL
    OR included_grant_plan_kind IN ('trial', 'paid', 'protection')
  );

COMMENT ON COLUMN public.credit_wallets.banked_trial_credits IS
  'Unused trial included credits when user drops off trialing/active; applied on next paid/protection included grant only (not top-ups).';

COMMENT ON COLUMN public.credit_wallets.included_grant_plan_kind IS
  'Which allowance built the current included pool (trial vs paid vs protection), for rollover/banking.';

-- Best-effort: existing trial pools without a kind still bank on downgrade via heuristics in app;
-- mark obvious trial rows so rollover to paid works.
UPDATE public.credit_wallets w
SET included_grant_plan_kind = 'trial'
FROM public.subscriptions s
WHERE s.user_id = w.user_id
  AND w.included_credits_remaining > 0
  AND w.included_grant_plan_kind IS NULL
  AND lower(coalesce(s.plan_id, '')) = 'divine-trial'
  AND lower(coalesce(s.status, '')) IN ('active', 'trialing');

COMMIT;
