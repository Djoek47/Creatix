-- Version history for rollback/diff in Brand Uniformity beta.
CREATE TABLE IF NOT EXISTS public.brand_profile_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_version INTEGER NOT NULL CHECK (profile_version > 0),
  profile JSONB NOT NULL,
  markdown TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_profile_versions_user_created
  ON public.brand_profile_versions(user_id, created_at DESC);

ALTER TABLE public.brand_profile_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_profile_versions_select_own" ON public.brand_profile_versions;
DROP POLICY IF EXISTS "brand_profile_versions_insert_own" ON public.brand_profile_versions;
DROP POLICY IF EXISTS "brand_profile_versions_delete_own" ON public.brand_profile_versions;

CREATE POLICY "brand_profile_versions_select_own" ON public.brand_profile_versions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "brand_profile_versions_insert_own" ON public.brand_profile_versions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "brand_profile_versions_delete_own" ON public.brand_profile_versions
  FOR DELETE USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';

