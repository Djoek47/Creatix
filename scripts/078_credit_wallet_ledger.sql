-- Credit wallet + ledger (included vs purchased buckets) with idempotent debit/grant RPCs.
-- Included credits expire at cycle boundary; purchased credits can carry into the next cycle.

CREATE TABLE IF NOT EXISTS public.credit_wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  included_credits_remaining INTEGER NOT NULL DEFAULT 0 CHECK (included_credits_remaining >= 0),
  purchased_credits_remaining INTEGER NOT NULL DEFAULT 0 CHECK (purchased_credits_remaining >= 0),
  included_cycle_start TIMESTAMP WITH TIME ZONE,
  included_cycle_end TIMESTAMP WITH TIME ZONE,
  last_consumed_at TIMESTAMP WITH TIME ZONE,
  last_granted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.credit_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('included_monthly', 'topup_pack', 'manual_adjustment')),
  bucket TEXT NOT NULL CHECK (bucket IN ('included', 'purchased')),
  credits INTEGER NOT NULL CHECK (credits > 0),
  remaining_credits INTEGER NOT NULL CHECK (remaining_credits >= 0),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  stripe_checkout_session_id TEXT,
  idempotency_key TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_grants_stripe_session_id
  ON public.credit_grants (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_credit_grants_user_expires
  ON public.credit_grants (user_id, expires_at);

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('debit', 'credit', 'expire_adjustment')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  reason_code TEXT NOT NULL,
  reason_ref TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  before_included INTEGER NOT NULL DEFAULT 0,
  before_purchased INTEGER NOT NULL DEFAULT 0,
  after_included INTEGER NOT NULL DEFAULT 0,
  after_purchased INTEGER NOT NULL DEFAULT 0,
  grant_id UUID REFERENCES public.credit_grants(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created
  ON public.credit_transactions (user_id, created_at DESC);

ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS credit_wallets_select_own ON public.credit_wallets;
CREATE POLICY credit_wallets_select_own
  ON public.credit_wallets
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS credit_wallets_insert_own ON public.credit_wallets;
CREATE POLICY credit_wallets_insert_own
  ON public.credit_wallets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS credit_wallets_update_own ON public.credit_wallets;
CREATE POLICY credit_wallets_update_own
  ON public.credit_wallets
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS credit_grants_select_own ON public.credit_grants;
CREATE POLICY credit_grants_select_own
  ON public.credit_grants
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS credit_transactions_select_own ON public.credit_transactions;
CREATE POLICY credit_transactions_select_own
  ON public.credit_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.ensure_credit_wallet(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.credit_wallets (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_credit_grants_for_user(p_user_id UUID)
RETURNS TABLE(expired_included INTEGER, expired_purchased INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_included INTEGER := 0;
  v_expired_purchased INTEGER := 0;
BEGIN
  PERFORM public.ensure_credit_wallet(p_user_id);

  WITH expired AS (
    UPDATE public.credit_grants
    SET remaining_credits = 0
    WHERE user_id = p_user_id
      AND remaining_credits > 0
      AND expires_at <= now()
    RETURNING bucket, remaining_credits
  )
  SELECT
    COALESCE(SUM(CASE WHEN bucket = 'included' THEN remaining_credits ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN bucket = 'purchased' THEN remaining_credits ELSE 0 END), 0)
  INTO v_expired_included, v_expired_purchased
  FROM expired;

  IF v_expired_included > 0 OR v_expired_purchased > 0 THEN
    UPDATE public.credit_wallets
    SET
      included_credits_remaining = GREATEST(0, included_credits_remaining - v_expired_included),
      purchased_credits_remaining = GREATEST(0, purchased_credits_remaining - v_expired_purchased),
      updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  RETURN QUERY SELECT v_expired_included, v_expired_purchased;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_credit_wallet(
  p_user_id UUID,
  p_source TEXT,
  p_bucket TEXT,
  p_credits INTEGER,
  p_expires_at TIMESTAMP WITH TIME ZONE,
  p_reason_code TEXT,
  p_reason_ref TEXT,
  p_idempotency_key TEXT,
  p_stripe_checkout_session_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  applied BOOLEAN,
  included_remaining INTEGER,
  purchased_remaining INTEGER,
  total_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.credit_wallets%ROWTYPE;
  v_before_included INTEGER;
  v_before_purchased INTEGER;
  v_grant_id UUID;
  v_existing BOOLEAN := FALSE;
BEGIN
  IF p_credits <= 0 THEN
    RAISE EXCEPTION 'p_credits must be > 0';
  END IF;

  PERFORM public.ensure_credit_wallet(p_user_id);
  PERFORM public.expire_credit_grants_for_user(p_user_id);

  SELECT * INTO v_wallet
  FROM public.credit_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  SELECT TRUE INTO v_existing
  FROM public.credit_transactions
  WHERE user_id = p_user_id
    AND idempotency_key = p_idempotency_key
  LIMIT 1;

  IF v_existing THEN
    RETURN QUERY
    SELECT
      FALSE AS applied,
      v_wallet.included_credits_remaining,
      v_wallet.purchased_credits_remaining,
      (v_wallet.included_credits_remaining + v_wallet.purchased_credits_remaining);
    RETURN;
  END IF;

  v_before_included := v_wallet.included_credits_remaining;
  v_before_purchased := v_wallet.purchased_credits_remaining;

  INSERT INTO public.credit_grants (
    user_id,
    source,
    bucket,
    credits,
    remaining_credits,
    expires_at,
    stripe_checkout_session_id,
    idempotency_key,
    metadata
  )
  VALUES (
    p_user_id,
    p_source,
    p_bucket,
    p_credits,
    p_credits,
    p_expires_at,
    p_stripe_checkout_session_id,
    p_idempotency_key,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_grant_id;

  UPDATE public.credit_wallets
  SET
    included_credits_remaining =
      included_credits_remaining + CASE WHEN p_bucket = 'included' THEN p_credits ELSE 0 END,
    purchased_credits_remaining =
      purchased_credits_remaining + CASE WHEN p_bucket = 'purchased' THEN p_credits ELSE 0 END,
    last_granted_at = now(),
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_wallet;

  INSERT INTO public.credit_transactions (
    user_id,
    kind,
    amount,
    reason_code,
    reason_ref,
    idempotency_key,
    before_included,
    before_purchased,
    after_included,
    after_purchased,
    grant_id,
    metadata
  )
  VALUES (
    p_user_id,
    'credit',
    p_credits,
    p_reason_code,
    p_reason_ref,
    p_idempotency_key,
    v_before_included,
    v_before_purchased,
    v_wallet.included_credits_remaining,
    v_wallet.purchased_credits_remaining,
    v_grant_id,
    COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN QUERY
  SELECT
    TRUE AS applied,
    v_wallet.included_credits_remaining,
    v_wallet.purchased_credits_remaining,
    (v_wallet.included_credits_remaining + v_wallet.purchased_credits_remaining);
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_credit_wallet(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason_code TEXT,
  p_reason_ref TEXT,
  p_idempotency_key TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  ok BOOLEAN,
  error_code TEXT,
  included_spent INTEGER,
  purchased_spent INTEGER,
  included_remaining INTEGER,
  purchased_remaining INTEGER,
  total_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.credit_wallets%ROWTYPE;
  v_before_included INTEGER;
  v_before_purchased INTEGER;
  v_existing BOOLEAN := FALSE;
  v_included_spent INTEGER := 0;
  v_purchased_spent INTEGER := 0;
  v_remaining INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'p_amount must be > 0';
  END IF;

  PERFORM public.ensure_credit_wallet(p_user_id);
  PERFORM public.expire_credit_grants_for_user(p_user_id);

  SELECT * INTO v_wallet
  FROM public.credit_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  SELECT TRUE INTO v_existing
  FROM public.credit_transactions
  WHERE user_id = p_user_id
    AND idempotency_key = p_idempotency_key
  LIMIT 1;

  IF v_existing THEN
    RETURN QUERY
    SELECT
      TRUE AS ok,
      NULL::TEXT AS error_code,
      0 AS included_spent,
      0 AS purchased_spent,
      v_wallet.included_credits_remaining,
      v_wallet.purchased_credits_remaining,
      (v_wallet.included_credits_remaining + v_wallet.purchased_credits_remaining);
    RETURN;
  END IF;

  IF (v_wallet.included_credits_remaining + v_wallet.purchased_credits_remaining) < p_amount THEN
    RETURN QUERY
    SELECT
      FALSE AS ok,
      'insufficient_credits'::TEXT AS error_code,
      0,
      0,
      v_wallet.included_credits_remaining,
      v_wallet.purchased_credits_remaining,
      (v_wallet.included_credits_remaining + v_wallet.purchased_credits_remaining);
    RETURN;
  END IF;

  v_before_included := v_wallet.included_credits_remaining;
  v_before_purchased := v_wallet.purchased_credits_remaining;

  v_included_spent := LEAST(v_wallet.included_credits_remaining, p_amount);
  v_remaining := p_amount - v_included_spent;
  v_purchased_spent := LEAST(v_wallet.purchased_credits_remaining, v_remaining);

  UPDATE public.credit_wallets
  SET
    included_credits_remaining = included_credits_remaining - v_included_spent,
    purchased_credits_remaining = purchased_credits_remaining - v_purchased_spent,
    last_consumed_at = now(),
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_wallet;

  INSERT INTO public.credit_transactions (
    user_id,
    kind,
    amount,
    reason_code,
    reason_ref,
    idempotency_key,
    before_included,
    before_purchased,
    after_included,
    after_purchased,
    metadata
  )
  VALUES (
    p_user_id,
    'debit',
    p_amount,
    p_reason_code,
    p_reason_ref,
    p_idempotency_key,
    v_before_included,
    v_before_purchased,
    v_wallet.included_credits_remaining,
    v_wallet.purchased_credits_remaining,
    jsonb_build_object(
      'included_spent', v_included_spent,
      'purchased_spent', v_purchased_spent
    ) || COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN QUERY
  SELECT
    TRUE AS ok,
    NULL::TEXT AS error_code,
    v_included_spent,
    v_purchased_spent,
    v_wallet.included_credits_remaining,
    v_wallet.purchased_credits_remaining,
    (v_wallet.included_credits_remaining + v_wallet.purchased_credits_remaining);
END;
$$;

CREATE OR REPLACE VIEW public.credit_wallet_reconciliation AS
SELECT
  w.user_id,
  w.included_credits_remaining,
  w.purchased_credits_remaining,
  (w.included_credits_remaining + w.purchased_credits_remaining) AS wallet_total,
  COALESCE((
    SELECT SUM(
      CASE
        WHEN t.kind = 'credit' THEN t.amount
        WHEN t.kind = 'debit' THEN -t.amount
        WHEN t.kind = 'expire_adjustment' THEN -t.amount
        ELSE 0
      END
    )
    FROM public.credit_transactions t
    WHERE t.user_id = w.user_id
  ), 0) AS ledger_total,
  (
    (w.included_credits_remaining + w.purchased_credits_remaining) -
    COALESCE((
      SELECT SUM(
        CASE
          WHEN t.kind = 'credit' THEN t.amount
          WHEN t.kind = 'debit' THEN -t.amount
          WHEN t.kind = 'expire_adjustment' THEN -t.amount
          ELSE 0
        END
      )
      FROM public.credit_transactions t
      WHERE t.user_id = w.user_id
    ), 0)
  ) AS drift
FROM public.credit_wallets w;

CREATE OR REPLACE FUNCTION public.expire_all_credit_wallets()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_count INTEGER := 0;
BEGIN
  FOR v_user IN SELECT user_id FROM public.credit_wallets
  LOOP
    PERFORM public.expire_credit_grants_for_user(v_user);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
