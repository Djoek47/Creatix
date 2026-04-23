-- Optional per-platform “follows” (e.g. free-page followers) alongside total_fans (subscribers/CRM main count).
-- Used in Fans page breakdown: e.g. OnlyFans subs + free follows, Fansly subscribers + followers.

ALTER TABLE public.analytics_snapshots
ADD COLUMN IF NOT EXISTS total_follows INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.analytics_snapshots.total_follows IS
  'Snapshot: non-sub / free “follows” on the platform when the API provides it (e.g. OF fansCount − subs; Fansly followersCount).';
