-- Cached Pulse readout per creator (server-computed wellbeing snapshot).
CREATE TABLE IF NOT EXISTS public.creator_pulse_snapshots (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_pulse_snapshots_computed_at ON public.creator_pulse_snapshots (computed_at DESC);

COMMENT ON TABLE public.creator_pulse_snapshots IS 'Latest Pulse wellbeing snapshot for dashboard shell + well-being page (TTL refreshed via API).';

ALTER TABLE public.creator_pulse_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creator_pulse_snapshots_select_own" ON public.creator_pulse_snapshots;
DROP POLICY IF EXISTS "creator_pulse_snapshots_upsert_own" ON public.creator_pulse_snapshots;

CREATE POLICY "creator_pulse_snapshots_select_own" ON public.creator_pulse_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "creator_pulse_snapshots_upsert_own" ON public.creator_pulse_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "creator_pulse_snapshots_update_own" ON public.creator_pulse_snapshots
  FOR UPDATE USING (auth.uid() = user_id);
