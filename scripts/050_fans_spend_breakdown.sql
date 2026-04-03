-- Per-channel spend tracking for CRM + fans dashboard breakdown (subscription / tips / DMs / feed PPV).
-- Nullable columns mean "unknown" for rows predating this migration or non-webhook updates.

ALTER TABLE public.fans
  ADD COLUMN IF NOT EXISTS spend_subscriptions NUMERIC(12, 2);

ALTER TABLE public.fans
  ADD COLUMN IF NOT EXISTS spend_tips NUMERIC(12, 2);

ALTER TABLE public.fans
  ADD COLUMN IF NOT EXISTS spend_messages NUMERIC(12, 2);

ALTER TABLE public.fans
  ADD COLUMN IF NOT EXISTS spend_posts NUMERIC(12, 2);

COMMENT ON COLUMN public.fans.spend_subscriptions IS 'Tracked subscription revenue (USD) from webhooks/sync where categorized.';
COMMENT ON COLUMN public.fans.spend_tips IS 'Tracked tips (USD).';
COMMENT ON COLUMN public.fans.spend_messages IS 'Tracked chat/PPV in DMs (USD).';
COMMENT ON COLUMN public.fans.spend_posts IS 'Tracked feed/story PPV (USD).';

CREATE OR REPLACE FUNCTION public.increment_fan_spending_categorized(
  p_user_id uuid,
  p_fan_id text,
  p_amount numeric,
  p_bucket text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b text := lower(trim(COALESCE(p_bucket, '')));
BEGIN
  IF p_amount IS NULL OR p_amount = 0 THEN
    RETURN;
  END IF;

  UPDATE public.fans
  SET
    total_spent = COALESCE(total_spent, 0) + p_amount,
    spend_subscriptions = CASE
      WHEN b = 'subscription' THEN COALESCE(spend_subscriptions, 0) + p_amount
      ELSE spend_subscriptions
    END,
    spend_tips = CASE
      WHEN b = 'tip' THEN COALESCE(spend_tips, 0) + p_amount
      ELSE spend_tips
    END,
    spend_messages = CASE
      WHEN b = 'message' THEN COALESCE(spend_messages, 0) + p_amount
      ELSE spend_messages
    END,
    spend_posts = CASE
      WHEN b = 'post' THEN COALESCE(spend_posts, 0) + p_amount
      ELSE spend_posts
    END,
    subscription_tier = CASE
      WHEN COALESCE(total_spent, 0) + p_amount >= 500 THEN 'vip'
      WHEN COALESCE(total_spent, 0) + p_amount >= 100 THEN 'whale'
      ELSE COALESCE(subscription_tier, 'regular')
    END,
    last_interaction_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND platform = 'onlyfans'
    AND platform_fan_id = p_fan_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_fan_spending_categorized(uuid, text, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_fan_spending_categorized(uuid, text, numeric, text) TO service_role;
