-- Per-user outbound webhooks: Creatix POSTs each logged AI usage event to the creator's URL.
-- OpenAI/xAI do not expose per-end-user webhooks for shared API keys; this is server-side attribution.
-- Access: service role only (RLS enabled, no policies).

CREATE TABLE IF NOT EXISTS public.user_usage_webhook_endpoints (
  user_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_usage_webhook_endpoints IS
  'Optional HTTPS URL + HMAC secret; server POSTs ai.usage payloads when ai_usage_events rows are inserted.';

ALTER TABLE public.user_usage_webhook_endpoints ENABLE ROW LEVEL SECURITY;
