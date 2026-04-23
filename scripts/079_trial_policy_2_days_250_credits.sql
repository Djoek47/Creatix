-- 079: Update trial policy to 2 days, 250 credits, card-required onboarding path.
--
-- Note:
-- - Card collection is enforced in app checkout (Stripe setup-mode trial start).
-- - This migration aligns DB defaults + signup bootstrap values for new users.

BEGIN;

ALTER TABLE public.subscriptions
  ALTER COLUMN ai_credits_limit SET DEFAULT 250;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')), '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.subscriptions (
    user_id,
    plan_id,
    status,
    ai_credits_used,
    ai_credits_limit,
    storage_used_mb,
    storage_limit_mb,
    trial_ends_at,
    current_period_end
  )
  VALUES (
    NEW.id,
    'divine-trial',
    'trial',
    0,
    250,
    0,
    5120,
    (now() AT TIME ZONE 'utc') + interval '2 days',
    (now() AT TIME ZONE 'utc') + interval '2 days'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMIT;
