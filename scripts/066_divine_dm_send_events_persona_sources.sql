-- Allow Circe / Venus / Flirt persona attribution on divine_dm_send_events (bubble styling).
ALTER TABLE public.divine_dm_send_events
  DROP CONSTRAINT IF EXISTS divine_dm_send_events_source_check;

ALTER TABLE public.divine_dm_send_events
  ADD CONSTRAINT divine_dm_send_events_source_check
  CHECK (source IN ('user', 'divine', 'divine_scheduled', 'circe', 'venus', 'flirt'));
