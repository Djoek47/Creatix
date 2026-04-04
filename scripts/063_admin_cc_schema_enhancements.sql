-- Admin C&C enhancements: totals, safe_context, effective_from, aggregates, login rate limit.
-- Run after 062_admin_usage_monitoring.sql
--
-- Auth model: use public.profiles.role = 'admin' (see docs/internal/ADMIN_USAGE_AND_COSTS.md).
-- No separate admin_users table — promote via SQL: UPDATE profiles SET role = 'admin' WHERE id = '...';

-- ---------------------------------------------------------------------------
-- ai_usage_events: total_tokens + tighter estimated_usd precision (reporting)
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_usage_events
  ADD COLUMN IF NOT EXISTS total_tokens integer NOT NULL DEFAULT 0;

UPDATE public.ai_usage_events
SET total_tokens = COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)
WHERE total_tokens = 0;

ALTER TABLE public.ai_usage_events
  ALTER COLUMN estimated_usd TYPE numeric(12, 6);

COMMENT ON COLUMN public.ai_usage_events.total_tokens IS
  'Redundant sum of input + output for reporting; kept in sync on insert.';

-- ---------------------------------------------------------------------------
-- api_error_logs: rename context -> safe_context (truncated, no secrets)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'api_error_logs' AND column_name = 'context'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'api_error_logs' AND column_name = 'safe_context'
  ) THEN
    ALTER TABLE public.api_error_logs RENAME COLUMN context TO safe_context;
  END IF;
END $$;

COMMENT ON COLUMN public.api_error_logs.safe_context IS
  'Truncated, redacted JSON — no bodies, tokens, or secrets.';

-- ---------------------------------------------------------------------------
-- ai_unit_costs: when this rate became active (audit / future SCD)
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_unit_costs
  ADD COLUMN IF NOT EXISTS effective_from timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.ai_unit_costs.effective_from IS
  'Timestamp when this row''s rates became active; updated when admins change pricing assumptions.';

-- ---------------------------------------------------------------------------
-- Rate limiting admin login attempts (IP hashed server-side only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text NOT NULL,
  outcome text NOT NULL DEFAULT 'attempt' CHECK (outcome IN ('attempt', 'blocked_allowlist', 'success'))
);

CREATE INDEX IF NOT EXISTS admin_login_attempts_created_idx
  ON public.admin_login_attempts (created_at DESC);

CREATE INDEX IF NOT EXISTS admin_login_attempts_ip_hash_created_idx
  ON public.admin_login_attempts (ip_hash, created_at DESC);

ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.admin_login_attempts IS
  'Append-only; app inserts via service role before admin password login. No PII stored.';

-- ---------------------------------------------------------------------------
-- Reporting views (RLS on base tables = no direct client access without policies)
-- ---------------------------------------------------------------------------
-- security_invoker: enforce permissions/RLS as the querying role (not view owner). Server uses service role.
CREATE OR REPLACE VIEW public.admin_v_user_usage_daily
WITH (security_invoker = true) AS
SELECT
  user_id,
  (date_trunc('day', created_at AT TIME ZONE 'UTC'))::date AS day_utc,
  COUNT(*)::bigint AS event_count,
  COALESCE(SUM(estimated_usd), 0)::numeric(16, 6) AS estimated_usd_sum,
  COALESCE(SUM(input_tokens), 0)::bigint AS input_tokens_sum,
  COALESCE(SUM(output_tokens), 0)::bigint AS output_tokens_sum,
  COALESCE(SUM(total_tokens), 0)::bigint AS total_tokens_sum
FROM public.ai_usage_events
WHERE user_id IS NOT NULL
GROUP BY user_id, (date_trunc('day', created_at AT TIME ZONE 'UTC'))::date;

COMMENT ON VIEW public.admin_v_user_usage_daily IS
  'Admin analytics: daily AI usage per user. Query with service role from server only.';

CREATE OR REPLACE VIEW public.admin_v_user_usage_monthly
WITH (security_invoker = true) AS
SELECT
  user_id,
  date_trunc('month', created_at AT TIME ZONE 'UTC')::date AS month_utc,
  COUNT(*)::bigint AS event_count,
  COALESCE(SUM(estimated_usd), 0)::numeric(16, 6) AS estimated_usd_sum,
  COALESCE(SUM(input_tokens), 0)::bigint AS input_tokens_sum,
  COALESCE(SUM(output_tokens), 0)::bigint AS output_tokens_sum
FROM public.ai_usage_events
WHERE user_id IS NOT NULL
GROUP BY user_id, date_trunc('month', created_at AT TIME ZONE 'UTC')::date;

COMMENT ON VIEW public.admin_v_user_usage_monthly IS
  'Admin analytics: monthly AI usage per user. Query with service role from server only.';
