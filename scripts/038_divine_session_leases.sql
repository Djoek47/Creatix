-- Optional: single active Divine Manager client session per user (stub for multi-agent gating).
-- Enable with DIVINE_ENFORCE_SESSION_LEASE=true — see docs/divine-multi-agent-pricing.md

CREATE TABLE IF NOT EXISTS public.divine_session_leases (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  session_id text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes')
);

ALTER TABLE public.divine_session_leases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own divine session lease" ON public.divine_session_leases;
CREATE POLICY "Users manage own divine session lease"
  ON public.divine_session_leases
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_divine_session_leases_expires ON public.divine_session_leases (expires_at);

COMMENT ON TABLE public.divine_session_leases IS 'Tracks last claimed Divine Manager session id per user for optional concurrent-session enforcement.';
