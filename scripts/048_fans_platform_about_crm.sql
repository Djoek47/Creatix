-- Fan profile text from OnlyFans API (when available) + automation override for creator-like contacts
ALTER TABLE public.fans
  ADD COLUMN IF NOT EXISTS platform_about TEXT;

ALTER TABLE public.fans
  ADD COLUMN IF NOT EXISTS platform_about_fetched_at TIMESTAMPTZ;

ALTER TABLE public.fans
  ADD COLUMN IF NOT EXISTS treat_as_fan_for_automation BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.fans.platform_about IS 'Subscriber profile/about text from OnlyFans API when exposed; used for creator-likelihood heuristics.';
COMMENT ON COLUMN public.fans.platform_about_fetched_at IS 'Last time platform_about was refreshed from the API.';
COMMENT ON COLUMN public.fans.treat_as_fan_for_automation IS 'If true, run AI Chatter / Commenter analysis even when heuristics suggest a fellow creator.';
