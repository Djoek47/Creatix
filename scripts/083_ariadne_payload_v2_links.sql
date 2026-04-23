-- Payload v2 linkage table (opaque payload_ref -> recipient mapping authority).

CREATE TABLE IF NOT EXISTS public.ariadne_payload_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payload_ref TEXT NOT NULL UNIQUE,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  recipient_key TEXT NOT NULL,
  linkage_hash TEXT NOT NULL,
  algorithm_version TEXT NOT NULL DEFAULT 'hybrid-v2',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ariadne_payload_links_user_created
  ON public.ariadne_payload_links (user_id, created_at DESC);

ALTER TABLE public.ariadne_payload_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ariadne_payload_links_select_own" ON public.ariadne_payload_links FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "ariadne_payload_links_insert_own" ON public.ariadne_payload_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

