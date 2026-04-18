-- Link Ariadne exports to chat fans (CRM) for attribution lists and Messages tooling.

ALTER TABLE public.ariadne_exports
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS platform_fan_id TEXT;

CREATE INDEX IF NOT EXISTS idx_ariadne_exports_user_platform_fan
  ON public.ariadne_exports (user_id, platform, platform_fan_id)
  WHERE platform IS NOT NULL AND platform_fan_id IS NOT NULL;

COMMENT ON COLUMN public.ariadne_exports.platform IS 'e.g. onlyfans — when recipient was chosen from chat fans';
COMMENT ON COLUMN public.ariadne_exports.platform_fan_id IS 'Platform fan id (e.g. OF user id) matching divine_fan_recents / messages';
