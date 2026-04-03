-- Admin C&C: AI usage events, API error logs, unit costs, audit trail.
-- Access: application uses SUPABASE_SERVICE_ROLE_KEY for writes/reads (bypasses RLS).
-- RLS enabled with no policies = deny direct client access.

CREATE TABLE IF NOT EXISTS public.ai_unit_costs (
  model_key text PRIMARY KEY,
  display_name text,
  usd_per_1m_input numeric(14, 8) NOT NULL DEFAULT 0,
  usd_per_1m_output numeric(14, 8) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_unit_costs IS
  'USD per 1M tokens for estimated cost in admin dashboard; edit via /admin/settings.';

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  feature text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  estimated_usd numeric(16, 8) NOT NULL DEFAULT 0,
  request_id text,
  success boolean NOT NULL DEFAULT true,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS ai_usage_events_user_created_idx
  ON public.ai_usage_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_usage_events_created_idx
  ON public.ai_usage_events (created_at DESC);

COMMENT ON TABLE public.ai_usage_events IS
  'Append-only AI call attribution for admin cost reporting.';

CREATE TABLE IF NOT EXISTS public.api_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  route text NOT NULL,
  http_status integer,
  error_code text,
  message text NOT NULL,
  stack text,
  safe_context jsonb
);

CREATE INDEX IF NOT EXISTS api_error_logs_user_created_idx
  ON public.api_error_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS api_error_logs_created_idx
  ON public.api_error_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  admin_user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE SET NULL,
  action text NOT NULL,
  target_user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  payload jsonb
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx
  ON public.admin_audit_log (created_at DESC);

ALTER TABLE public.ai_unit_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Seed defaults (approx mid-2025 public list prices; reconcile against your invoices).
INSERT INTO public.ai_unit_costs (model_key, display_name, usd_per_1m_input, usd_per_1m_output)
VALUES
  ('gpt-4o-mini', 'OpenAI GPT-4o mini', 0.15, 0.60),
  ('gpt-4o', 'OpenAI GPT-4o', 2.50, 10.00),
  ('openai/gpt-4o-mini', 'Gateway openai/gpt-4o-mini', 0.15, 0.60),
  ('anthropic/claude-sonnet-4', 'Claude Sonnet 4 (gateway)', 3.00, 15.00),
  ('grok-2-latest', 'xAI Grok (estimate)', 2.00, 10.00),
  ('default', 'Fallback when model unknown', 0.50, 2.00)
ON CONFLICT (model_key) DO NOTHING;
