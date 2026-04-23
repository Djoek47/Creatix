-- Per-platform creator status (preset + optional detail)
ALTER TABLE public.platform_connections
ADD COLUMN IF NOT EXISTS creator_status_preset TEXT NOT NULL DEFAULT 'available';

ALTER TABLE public.platform_connections
ADD COLUMN IF NOT EXISTS creator_status_detail TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'platform_connections_creator_status_preset_check'
  ) THEN
    ALTER TABLE public.platform_connections
    ADD CONSTRAINT platform_connections_creator_status_preset_check
    CHECK (creator_status_preset IN ('available', 'away', 'busy', 'dnd', 'custom'));
  END IF;
END $$;

COMMENT ON COLUMN public.platform_connections.creator_status_preset IS
'Creator-defined status preset for this platform connection (available/away/busy/dnd/custom).';

COMMENT ON COLUMN public.platform_connections.creator_status_detail IS
'Optional creator-defined status detail for this platform connection. Recommended max 120 chars.';
