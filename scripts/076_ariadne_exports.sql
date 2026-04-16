-- Ariadne Trace: per-recipient forensic export records (MVP append-v1 marker in file tail).

CREATE TABLE IF NOT EXISTS public.ariadne_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  recipient_key TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('frame_export', 'vault_standalone')),
  algorithm_version TEXT NOT NULL DEFAULT 'append-v1',
  payload_id TEXT NOT NULL,
  payload_manifest JSONB NOT NULL DEFAULT '{}',
  file_sha256_before TEXT,
  file_sha256_after TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ariadne_exports_payload_id ON public.ariadne_exports (payload_id);
CREATE INDEX IF NOT EXISTS idx_ariadne_exports_user_content ON public.ariadne_exports (user_id, content_id);
CREATE INDEX IF NOT EXISTS idx_ariadne_exports_created ON public.ariadne_exports (created_at DESC);

COMMENT ON TABLE public.ariadne_exports IS 'Ariadne Trace: forensic watermark export records for leak attribution.';

ALTER TABLE public.ariadne_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ariadne_exports_select_own" ON public.ariadne_exports FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "ariadne_exports_insert_own" ON public.ariadne_exports FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ariadne_exports_delete_own" ON public.ariadne_exports FOR DELETE
  USING (auth.uid() = user_id);
