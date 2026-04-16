-- Optional JSON for Frame edit presets / tags (vault + Frame UI).

ALTER TABLE public.content ADD COLUMN IF NOT EXISTS vault_edit_meta JSONB DEFAULT '{}';

COMMENT ON COLUMN public.content.vault_edit_meta IS
  'Frame edit metadata: presetIds, tags, niche labels — consumed by Media vault and Frame fork.';
