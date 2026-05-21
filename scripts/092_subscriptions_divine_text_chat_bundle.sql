-- Tracks how many Divine Manager *text* turns used the silent per-period bundle vs wallet credits.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS divine_text_chat_bundle_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS divine_text_chat_bundle_anchor TIMESTAMPTZ;

COMMENT ON COLUMN public.subscriptions.divine_text_chat_bundle_used IS
  'Turns of /api/ai/divine-manager-chat charged to the included bundle (not wallet) in the current anchor period.';
COMMENT ON COLUMN public.subscriptions.divine_text_chat_bundle_anchor IS
  'subscriptions.current_period_start snapshot for bundle accounting; reset bundle when the billing period advances.';

CREATE OR REPLACE FUNCTION public.claim_divine_manager_text_bundle(p_user_id uuid, p_limit integer DEFAULT 100)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.subscriptions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN json_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF p_limit < 1 THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_limit');
  END IF;

  SELECT * INTO r FROM public.subscriptions WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'no_subscription');
  END IF;

  IF r.current_period_start IS DISTINCT FROM r.divine_text_chat_bundle_anchor THEN
    r.divine_text_chat_bundle_used := 0;
  END IF;
  r.divine_text_chat_bundle_anchor := r.current_period_start;

  IF COALESCE(r.divine_text_chat_bundle_used, 0) < p_limit THEN
    UPDATE public.subscriptions
    SET
      divine_text_chat_bundle_used = r.divine_text_chat_bundle_used + 1,
      divine_text_chat_bundle_anchor = r.divine_text_chat_bundle_anchor,
      updated_at = now()
    WHERE user_id = p_user_id;
    RETURN json_build_object('ok', true, 'mode', 'bundled');
  END IF;

  UPDATE public.subscriptions
  SET
    divine_text_chat_bundle_anchor = r.divine_text_chat_bundle_anchor,
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN json_build_object('ok', true, 'mode', 'credits');
END;
$$;

REVOKE ALL ON FUNCTION public.claim_divine_manager_text_bundle(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_divine_manager_text_bundle(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_divine_manager_text_bundle(uuid, integer) TO service_role;
