-- Canonical URL dedupe + media classification + reappearance tracking for leak_alerts

ALTER TABLE public.leak_alerts
  ADD COLUMN IF NOT EXISTS normalized_source_url TEXT;

ALTER TABLE public.leak_alerts
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'unknown';

ALTER TABLE public.leak_alerts
  ADD COLUMN IF NOT EXISTS reappearance_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.leak_alerts
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leak_alerts_media_type_check'
  ) THEN
    ALTER TABLE public.leak_alerts
      ADD CONSTRAINT leak_alerts_media_type_check
      CHECK (media_type IN ('video', 'photo', 'unknown'));
  END IF;
END $$;

COMMENT ON COLUMN public.leak_alerts.normalized_source_url IS 'Dedupe key: normalizeUrl(source_url); application maintains on insert/update';
COMMENT ON COLUMN public.leak_alerts.media_type IS 'video | photo | unknown — from AI triage + heuristics';
COMMENT ON COLUMN public.leak_alerts.reappearance_count IS 'Increments when the same canonical URL is seen again after a resolved-style outcome';
COMMENT ON COLUMN public.leak_alerts.last_seen_at IS 'Last time this canonical URL was observed in a scan';

CREATE INDEX IF NOT EXISTS idx_leak_alerts_user_normalized_url
  ON public.leak_alerts (user_id, normalized_source_url)
  WHERE normalized_source_url IS NOT NULL;
