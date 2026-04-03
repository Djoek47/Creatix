-- 064: Fix new-user signup (auth.users → profiles + subscriptions)
--
-- Common failure modes this addresses:
-- 1) Two separate AFTER INSERT triggers on auth.users (profile vs subscription) with undefined
--    execution order and separate SECURITY DEFINER bodies / search_path issues.
-- 2) RLS + FORCE ROW LEVEL SECURITY edge cases on public.profiles / public.subscriptions
--    blocking inserts from trigger context on some Postgres/Supabase configurations.
--
-- Safe to re-run: drops named triggers/function, recreates a single trigger + handle_new_user.
-- Run in Supabase Dashboard → SQL Editor (or psql) on the affected project.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Remove legacy split triggers
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.initialize_user_subscription();

-- ---------------------------------------------------------------------------
-- 2) One function: profile row first, then trial subscription (same transaction)
-- ---------------------------------------------------------------------------
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
    trial_ends_at,
    current_period_end
  )
  VALUES (
    NEW.id,
    'divine-trial',
    'trial',
    (now() AT TIME ZONE 'utc') + interval '14 days',
    (now() AT TIME ZONE 'utc') + interval '14 days'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creatix: on auth.users insert → profiles row, then divine-trial subscriptions row. SECURITY DEFINER; search_path=public.';

-- ---------------------------------------------------------------------------
-- 3) Single trigger (clear ordering)
-- ---------------------------------------------------------------------------
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4) Avoid forced RLS for table owner bypass quirks (no-op if already off)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions NO FORCE ROW LEVEL SECURITY;

COMMIT;
