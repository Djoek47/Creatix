-- Optional encrypted location vault for well-being glow insights.
-- Stores encrypted payload only; UI/API consume derived summaries.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS encrypted_location TEXT,
  ADD COLUMN IF NOT EXISTS has_location_set BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS location_hint TEXT,
  ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.encrypted_location IS 'AES-GCM encrypted location payload used for weather/golden-hour insights.';
COMMENT ON COLUMN public.profiles.has_location_set IS 'True when encrypted_location exists and is active.';
COMMENT ON COLUMN public.profiles.location_hint IS 'Human-readable location label (e.g. city, country) for UI display.';
COMMENT ON COLUMN public.profiles.location_updated_at IS 'Timestamp for latest encrypted location vault update.';
