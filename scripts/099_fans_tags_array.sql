-- Inbox CRM + mass audience tools expect `fans.tags` (segment labels / synced list names).
-- Was referenced in app code but never added to the base schema.
ALTER TABLE public.fans
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.fans.tags IS
  'CRM segment tags (e.g. smart classify, OnlyFans list names) for inbox filter and tools.';

CREATE INDEX IF NOT EXISTS idx_fans_user_tags
  ON public.fans USING GIN (tags);

NOTIFY pgrst, 'reload schema';
