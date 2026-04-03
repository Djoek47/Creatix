-- Create subscriptions table for tracking user plan and usage (public schema).
-- After this table exists, we extend public.handle_new_user (from 001) so ONE trigger
-- creates both profiles + trial subscription — avoids two auth.users triggers racing.
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_id TEXT NOT NULL DEFAULT 'divine-trial',
  status TEXT NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  ai_credits_used INTEGER DEFAULT 0,
  ai_credits_limit INTEGER DEFAULT 100,
  storage_used_mb INTEGER DEFAULT 0,
  storage_limit_mb INTEGER DEFAULT 5120,
  messages_sent INTEGER DEFAULT 0,
  api_calls_used INTEGER DEFAULT 0,
  last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "subscriptions_select_own" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_insert_own" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscriptions_update_own" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Legacy second trigger (removed): use single handle_new_user from 001, replaced below.
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
DROP FUNCTION IF EXISTS public.initialize_user_subscription();

-- Replace signup handler: profile row + trial subscription in one SECURITY DEFINER body.
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

ALTER TABLE public.subscriptions NO FORCE ROW LEVEL SECURITY;
