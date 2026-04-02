-- Creator gift wishlist: URLs + fetched metadata for Gift Suggester + AI Chatter context

CREATE TABLE IF NOT EXISTS public.creator_gift_wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  image_url TEXT,
  price_amount NUMERIC(12, 2),
  price_currency TEXT,
  fetch_status TEXT NOT NULL DEFAULT 'pending' CHECK (fetch_status IN ('pending', 'ok', 'failed')),
  fetch_error TEXT,
  fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, url)
);

CREATE INDEX IF NOT EXISTS idx_creator_gift_wishlist_user
  ON public.creator_gift_wishlist_items (user_id);
CREATE INDEX IF NOT EXISTS idx_creator_gift_wishlist_user_status
  ON public.creator_gift_wishlist_items (user_id, fetch_status);

ALTER TABLE public.creator_gift_wishlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creator_gift_wishlist_own ON public.creator_gift_wishlist_items;
CREATE POLICY creator_gift_wishlist_own ON public.creator_gift_wishlist_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.creator_gift_wishlist_items IS 'Creator-managed product links for AI gift suggestions and chatter.';
