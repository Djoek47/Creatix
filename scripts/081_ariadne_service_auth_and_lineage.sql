-- Ariadne service auth hardening, lineage expansion, and detect event logging.

ALTER TABLE public.ariadne_exports
  ADD COLUMN IF NOT EXISTS job_id TEXT,
  ADD COLUMN IF NOT EXISTS pipeline_version TEXT,
  ADD COLUMN IF NOT EXISTS encoder_profile TEXT;

CREATE INDEX IF NOT EXISTS idx_ariadne_exports_job_id
  ON public.ariadne_exports (job_id);

CREATE TABLE IF NOT EXISTS public.ariadne_service_nonces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_name TEXT NOT NULL,
  nonce TEXT NOT NULL,
  request_path TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ariadne_service_nonces_service_nonce
  ON public.ariadne_service_nonces (service_name, nonce);

CREATE INDEX IF NOT EXISTS idx_ariadne_service_nonces_expires
  ON public.ariadne_service_nonces (expires_at);

ALTER TABLE public.ariadne_service_nonces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ariadne_service_nonces_select_none"
  ON public.ariadne_service_nonces FOR SELECT
  USING (false);

CREATE POLICY "ariadne_service_nonces_insert_none"
  ON public.ariadne_service_nonces FOR INSERT
  WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.ariadne_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_body JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ariadne_idempotency_keys_unique
  ON public.ariadne_idempotency_keys (service_name, endpoint, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_ariadne_idempotency_keys_user_created
  ON public.ariadne_idempotency_keys (user_id, created_at DESC);

ALTER TABLE public.ariadne_idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ariadne_idempotency_select_own"
  ON public.ariadne_idempotency_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "ariadne_idempotency_insert_own"
  ON public.ariadne_idempotency_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ariadne_detect_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  export_id UUID REFERENCES public.ariadne_exports(id) ON DELETE SET NULL,
  payload_id TEXT,
  source TEXT NOT NULL DEFAULT 'manual_upload',
  file_sha256 TEXT,
  file_name TEXT,
  match_state TEXT NOT NULL CHECK (match_state IN ('none', 'unregistered', 'registered')),
  confidence_score NUMERIC(5,2),
  confidence_gate_passed BOOLEAN DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ariadne_detect_events_user_created
  ON public.ariadne_detect_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ariadne_detect_events_export_created
  ON public.ariadne_detect_events (export_id, created_at DESC);

ALTER TABLE public.ariadne_detect_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ariadne_detect_events_select_own"
  ON public.ariadne_detect_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "ariadne_detect_events_insert_own"
  ON public.ariadne_detect_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);
