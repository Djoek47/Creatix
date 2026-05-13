-- Ariadne v2 async embed jobs and artifact logs.

CREATE TABLE IF NOT EXISTS public.ariadne_v2_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  recipient_key TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('frame_export', 'vault_standalone', 'message_send', 'mass_dm')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  idempotency_key TEXT NOT NULL UNIQUE,
  pipeline_version TEXT NOT NULL DEFAULT 'hybrid-v2',
  encoder_profile TEXT,
  frame_count INTEGER,
  embedded_windows INTEGER,
  psnr NUMERIC(10,4),
  ssim NUMERIC(10,6),
  size_delta_bytes BIGINT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ariadne_v2_jobs_user_created
  ON public.ariadne_v2_jobs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ariadne_v2_jobs_status_created
  ON public.ariadne_v2_jobs (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ariadne_v2_job_artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES public.ariadne_v2_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL,
  artifact_path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ariadne_v2_job_artifacts_job
  ON public.ariadne_v2_job_artifacts (job_id, created_at DESC);

ALTER TABLE public.ariadne_v2_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ariadne_v2_job_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ariadne_v2_jobs_select_own" ON public.ariadne_v2_jobs FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "ariadne_v2_jobs_insert_own" ON public.ariadne_v2_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ariadne_v2_artifacts_select_own" ON public.ariadne_v2_job_artifacts FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "ariadne_v2_artifacts_insert_own" ON public.ariadne_v2_job_artifacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

