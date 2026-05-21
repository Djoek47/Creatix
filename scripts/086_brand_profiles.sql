-- Brand Uniformity beta profile storage (canonical JSON + rendered markdown artifact).
CREATE TABLE IF NOT EXISTS public.brand_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile JSONB NOT NULL DEFAULT '{"version": 1}'::jsonb,
  markdown TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  is_beta_acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_profiles_updated_at ON public.brand_profiles(updated_at DESC);

ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_profiles_select_own" ON public.brand_profiles;
DROP POLICY IF EXISTS "brand_profiles_insert_own" ON public.brand_profiles;
DROP POLICY IF EXISTS "brand_profiles_update_own" ON public.brand_profiles;
DROP POLICY IF EXISTS "brand_profiles_delete_own" ON public.brand_profiles;

CREATE POLICY "brand_profiles_select_own" ON public.brand_profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "brand_profiles_insert_own" ON public.brand_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "brand_profiles_update_own" ON public.brand_profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "brand_profiles_delete_own" ON public.brand_profiles
  FOR DELETE USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';

