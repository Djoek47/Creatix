-- Churn batch digest: optional future-content / calendar teasing for at-risk fans.
ALTER TABLE public.circe_churn_settings
  ADD COLUMN IF NOT EXISTS tease_future_content BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.circe_churn_settings
  ADD COLUMN IF NOT EXISTS calendar_teaser_notes TEXT;

COMMENT ON COLUMN public.circe_churn_settings.tease_future_content IS 'When true, digest asks AI for future-drop and calendar-style teaser copy.';
COMMENT ON COLUMN public.circe_churn_settings.calendar_teaser_notes IS 'Optional creator notes: upcoming themes, days, or calendar for teaser ideas.';
