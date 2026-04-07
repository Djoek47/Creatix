-- App code selects platform_user_id for Fansly account id and fallbacks; base schema only had access_token.
ALTER TABLE public.platform_connections
  ADD COLUMN IF NOT EXISTS platform_user_id TEXT;

COMMENT ON COLUMN public.platform_connections.platform_user_id IS
  'Platform-native account/user id when stored separately (e.g. Fansly account_id). OnlyFans Partner API account id often uses access_token; both may be read in app code.';
