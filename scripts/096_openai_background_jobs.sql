-- Background OpenAI Responses jobs + webhook idempotency (openai) + user-readable API error logs.

-- Allow OpenAI webhook events in shared ledger (idempotency via webhook-id).
ALTER TABLE public.platform_webhook_event_ledger DROP CONSTRAINT IF EXISTS platform_webhook_event_ledger_platform_check;

ALTER TABLE public.platform_webhook_event_ledger
  ADD CONSTRAINT platform_webhook_event_ledger_platform_check
  CHECK (platform IN ('onlyfans', 'openai'));

CREATE TABLE IF NOT EXISTS public.openai_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  response_id text,
  feature text NOT NULL,
  model text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'in_progress', 'completed', 'failed', 'cancelled')),
  error_code text,
  error_message text,
  divine_manager_task_id uuid REFERENCES public.divine_manager_tasks (id) ON DELETE SET NULL,
  request_metadata jsonb NOT NULL DEFAULT '{}',
  result_summary jsonb,
  webhook_event_ids text[] NOT NULL DEFAULT '{}',
  usage_input_tokens integer NOT NULL DEFAULT 0,
  usage_output_tokens integer NOT NULL DEFAULT 0,
  usage_total_tokens integer NOT NULL DEFAULT 0,
  estimated_usd numeric(18, 8) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_openai_jobs_response_id_unique ON public.openai_jobs (response_id)
  WHERE response_id IS NOT NULL AND btrim(response_id) <> '';

CREATE INDEX IF NOT EXISTS idx_openai_jobs_user_created ON public.openai_jobs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_openai_jobs_status_created ON public.openai_jobs (status, created_at DESC);

COMMENT ON TABLE public.openai_jobs IS 'OpenAI Responses API background jobs; completion via webhook.';

ALTER TABLE public.openai_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own openai_jobs" ON public.openai_jobs;
CREATE POLICY "Users read own openai_jobs"
  ON public.openai_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- Creators can see their own Divine-related API errors (for get_recent_failures tool).
DROP POLICY IF EXISTS "Users read own api_error_logs" ON public.api_error_logs;
CREATE POLICY "Users read own api_error_logs"
  ON public.api_error_logs FOR SELECT
  USING (auth.uid() = user_id);
