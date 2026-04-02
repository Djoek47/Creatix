-- Fix: column notifications.origin does not exist (42703)
-- Run in Supabase SQL Editor if the app queries notifications.origin before full 034 is applied.
-- Safe to re-run (IF NOT EXISTS / DROP CONSTRAINT IF EXISTS).

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS origin text;

UPDATE public.notifications
SET origin = COALESCE(origin, 'platform_webhook')
WHERE origin IS NULL;

ALTER TABLE public.notifications
  ALTER COLUMN origin SET DEFAULT 'platform_webhook';

ALTER TABLE public.notifications
  ALTER COLUMN origin SET NOT NULL;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_origin_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_origin_check
  CHECK (origin IN ('platform_webhook', 'divine_app', 'platform_pull'));

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS platform_fan_id text;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS metadata jsonb;

CREATE INDEX IF NOT EXISTS idx_notifications_user_origin ON public.notifications (user_id, origin);
CREATE INDEX IF NOT EXISTS idx_notifications_platform_fan ON public.notifications (user_id, platform_fan_id)
  WHERE platform_fan_id IS NOT NULL;
