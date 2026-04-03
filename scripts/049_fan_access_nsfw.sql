-- Fan subscription kind (free vs paid page), content NSFW + who can see it, comment post access context
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- Fans: derived from subscription_price when synced (0 = free page, >0 = paid)
-- ---------------------------------------------------------------------------
ALTER TABLE public.fans
  ADD COLUMN IF NOT EXISTS subscription_account_type TEXT NOT NULL DEFAULT 'unknown';

ALTER TABLE public.fans
  DROP CONSTRAINT IF EXISTS fans_subscription_account_type_check;

ALTER TABLE public.fans
  ADD CONSTRAINT fans_subscription_account_type_check
  CHECK (subscription_account_type IN ('free', 'paid', 'unknown'));

COMMENT ON COLUMN public.fans.subscription_account_type IS
  'free = $0 subscription price (free OnlyFans page follower); paid = positive sub price; unknown = not synced.';

-- ---------------------------------------------------------------------------
-- Creatix vault / content: NSFW flag + which fans typically can access without extra PPV
-- ---------------------------------------------------------------------------
ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS is_nsfw BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS fan_access_tier TEXT NOT NULL DEFAULT 'unknown';

ALTER TABLE public.content
  DROP CONSTRAINT IF EXISTS content_fan_access_tier_check;

ALTER TABLE public.content
  ADD CONSTRAINT content_fan_access_tier_check
  CHECK (fan_access_tier IN ('free_feed', 'all_subscribers', 'ppv_or_locked', 'unknown'));

COMMENT ON COLUMN public.content.is_nsfw IS
  'Marks explicit/adult material so AI can calibrate tone and safety; default true for adult platforms.';

COMMENT ON COLUMN public.content.fan_access_tier IS
  'free_feed = on free page; all_subscribers = main feed for paying subs; ppv_or_locked = paywall/PPV bundle item; unknown = not set.';

-- ---------------------------------------------------------------------------
-- Post comments: post visibility vs fan (e.g. may comment without unlocking PPV)
-- ---------------------------------------------------------------------------
ALTER TABLE public.platform_post_comments
  ADD COLUMN IF NOT EXISTS post_fan_access_tier TEXT NOT NULL DEFAULT 'unknown';

ALTER TABLE public.platform_post_comments
  DROP CONSTRAINT IF EXISTS platform_post_comments_post_fan_access_tier_check;

ALTER TABLE public.platform_post_comments
  ADD CONSTRAINT platform_post_comments_post_fan_access_tier_check
  CHECK (post_fan_access_tier IN ('free_feed', 'all_subscribers', 'ppv_or_locked', 'unknown'));

ALTER TABLE public.platform_post_comments
  ADD COLUMN IF NOT EXISTS fan_may_comment_without_unlock BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.platform_post_comments.post_fan_access_tier IS
  'Best-effort: whether the commented-on post was free feed, sub-only, or PPV/locked.';

COMMENT ON COLUMN public.platform_post_comments.fan_may_comment_without_unlock IS
  'Platform behavior: fans can often comment on posts they have not purchased/unlocked; do not assume they saw media.';

-- Backfill fan subscription kind from known price
UPDATE public.fans
SET subscription_account_type = CASE
  WHEN subscription_price IS NOT NULL AND subscription_price <= 0 THEN 'free'
  WHEN subscription_price IS NOT NULL AND subscription_price > 0 THEN 'paid'
  ELSE subscription_account_type
END
WHERE subscription_account_type = 'unknown'
  AND subscription_price IS NOT NULL;
