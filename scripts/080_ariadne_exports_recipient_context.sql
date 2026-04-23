-- Ariadne Trace v2 metadata: normalized recipient context + message/mass origins.

ALTER TABLE public.ariadne_exports
  ADD COLUMN IF NOT EXISTS recipient_fan_id UUID REFERENCES public.fans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recipient_platform TEXT,
  ADD COLUMN IF NOT EXISTS recipient_platform_fan_id TEXT,
  ADD COLUMN IF NOT EXISTS recipient_username TEXT,
  ADD COLUMN IF NOT EXISTS recipient_display_name TEXT,
  ADD COLUMN IF NOT EXISTS origin_message_id TEXT,
  ADD COLUMN IF NOT EXISTS origin_mass_batch_id TEXT,
  ADD COLUMN IF NOT EXISTS export_path TEXT,
  ADD COLUMN IF NOT EXISTS content_title TEXT;

ALTER TABLE public.ariadne_exports
  DROP CONSTRAINT IF EXISTS ariadne_exports_source_check;

ALTER TABLE public.ariadne_exports
  ADD CONSTRAINT ariadne_exports_source_check
  CHECK (source IN ('frame_export', 'vault_standalone', 'message_send', 'mass_dm'));

ALTER TABLE public.ariadne_exports
  DROP CONSTRAINT IF EXISTS ariadne_exports_recipient_platform_check;

ALTER TABLE public.ariadne_exports
  ADD CONSTRAINT ariadne_exports_recipient_platform_check
  CHECK (
    recipient_platform IS NULL OR recipient_platform IN ('onlyfans', 'fansly', 'mym')
  );

CREATE INDEX IF NOT EXISTS idx_ariadne_exports_user_recipient_fan
  ON public.ariadne_exports (user_id, recipient_fan_id);

CREATE INDEX IF NOT EXISTS idx_ariadne_exports_user_platform_fan
  ON public.ariadne_exports (user_id, recipient_platform, recipient_platform_fan_id);

CREATE INDEX IF NOT EXISTS idx_ariadne_exports_user_source_created
  ON public.ariadne_exports (user_id, source, created_at DESC);
