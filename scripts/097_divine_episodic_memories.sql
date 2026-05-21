-- Episodic memory snippets for Divine text + voice context (Supermemory-lite pattern).

CREATE TABLE IF NOT EXISTS public.divine_episodic_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('chat', 'voice', 'system')),
  summary text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_divine_episodic_memories_user_created
  ON public.divine_episodic_memories (user_id, created_at DESC);

COMMENT ON TABLE public.divine_episodic_memories IS 'Short creator-facing memory bullets for Divine chat/voice continuity; prune in app layer.';

ALTER TABLE public.divine_episodic_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own divine_episodic_memories" ON public.divine_episodic_memories;
CREATE POLICY "Users manage own divine_episodic_memories"
  ON public.divine_episodic_memories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
