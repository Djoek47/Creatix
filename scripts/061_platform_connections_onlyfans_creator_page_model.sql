-- Creator OnlyFans page model: free page ($0 follow, PPV/messages revenue) vs paid subscription page.
-- Distinct from fans.subscription_account_type (per-fan list price vs creator).

ALTER TABLE public.platform_connections
  ADD COLUMN IF NOT EXISTS onlyfans_creator_page_model text
    DEFAULT 'unknown'
    CHECK (
      onlyfans_creator_page_model IS NULL
      OR onlyfans_creator_page_model IN ('free', 'paid', 'unknown')
    );

ALTER TABLE public.platform_connections
  ADD COLUMN IF NOT EXISTS onlyfans_creator_page_model_source text
    CHECK (
      onlyfans_creator_page_model_source IS NULL
      OR onlyfans_creator_page_model_source IN ('user', 'api')
    );

COMMENT ON COLUMN public.platform_connections.onlyfans_creator_page_model IS
  'OnlyFans creator account: free page vs paid sub page. Affects AI/workflow context.';

COMMENT ON COLUMN public.platform_connections.onlyfans_creator_page_model_source IS
  'user = set in app (do not overwrite with API). api = inferred from OnlyFans API.';

-- Existing rows: unknown, no source (eligible for API inference on next sync)
UPDATE public.platform_connections
SET onlyfans_creator_page_model = COALESCE(onlyfans_creator_page_model, 'unknown')
WHERE platform = 'onlyfans';
