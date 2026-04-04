-- Message send audit + Divine voice state time (per user, per UTC day).
-- Service role from API routes; RLS enabled with no policies.

CREATE TABLE IF NOT EXISTS public.message_send_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  platform text NOT NULL,
  fan_id text,
  source text NOT NULL,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS message_send_events_created_idx ON public.message_send_events (created_at DESC);
CREATE INDEX IF NOT EXISTS message_send_events_user_created_idx ON public.message_send_events (user_id, created_at DESC);

COMMENT ON TABLE public.message_send_events IS 'One row per outbound platform message (chat UI, mass, Divine, etc.).';

CREATE TABLE IF NOT EXISTS public.divine_voice_state_daily (
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  day_utc date NOT NULL,
  idle_ms bigint NOT NULL DEFAULT 0,
  working_ms bigint NOT NULL DEFAULT 0,
  speaking_ms bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day_utc)
);

CREATE INDEX IF NOT EXISTS divine_voice_state_daily_day_idx ON public.divine_voice_state_daily (day_utc DESC);

COMMENT ON TABLE public.divine_voice_state_daily IS 'Cumulative ms in Divine voice surface states while WebRTC connected (client telemetry).';

ALTER TABLE public.message_send_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divine_voice_state_daily ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.increment_divine_voice_state_daily(
  p_user_id uuid,
  p_day date,
  p_idle bigint,
  p_working bigint,
  p_speaking bigint
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.divine_voice_state_daily (user_id, day_utc, idle_ms, working_ms, speaking_ms, updated_at)
  VALUES (
    p_user_id,
    p_day,
    GREATEST(0, p_idle),
    GREATEST(0, p_working),
    GREATEST(0, p_speaking),
    now()
  )
  ON CONFLICT (user_id, day_utc) DO UPDATE SET
    idle_ms = public.divine_voice_state_daily.idle_ms + EXCLUDED.idle_ms,
    working_ms = public.divine_voice_state_daily.working_ms + EXCLUDED.working_ms,
    speaking_ms = public.divine_voice_state_daily.speaking_ms + EXCLUDED.speaking_ms,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.increment_divine_voice_state_daily(uuid, date, bigint, bigint, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_divine_voice_state_daily(uuid, date, bigint, bigint, bigint) TO service_role;
