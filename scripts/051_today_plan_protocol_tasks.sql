-- Today's Plan: priority tiers, plan day, ordering for creator_protocol_tasks. Safe to re-run.

ALTER TABLE public.creator_protocol_tasks
  ADD COLUMN IF NOT EXISTS plan_date date;

ALTER TABLE public.creator_protocol_tasks
  ADD COLUMN IF NOT EXISTS priority_tier smallint NOT NULL DEFAULT 4
    CHECK (priority_tier >= 1 AND priority_tier <= 4);

ALTER TABLE public.creator_protocol_tasks
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Backfill plan_date from created_at (UTC) before NOT NULL + default
UPDATE public.creator_protocol_tasks
SET plan_date = (created_at AT TIME ZONE 'utc')::date
WHERE plan_date IS NULL;

ALTER TABLE public.creator_protocol_tasks
  ALTER COLUMN plan_date SET DEFAULT (timezone('utc', now()))::date;

ALTER TABLE public.creator_protocol_tasks
  ALTER COLUMN plan_date SET NOT NULL;

COMMENT ON COLUMN public.creator_protocol_tasks.plan_date IS 'UTC calendar day this task belongs to; rollover bumps incomplete tasks to the next day.';
COMMENT ON COLUMN public.creator_protocol_tasks.priority_tier IS '1=notifications 2=inbox/DMs 3=protection/reputation 4=content/visibility';
COMMENT ON COLUMN public.creator_protocol_tasks.sort_order IS 'Lower sorts first within the same tier.';

-- Heuristic backfill: churn/retention tasks → tier 2
UPDATE public.creator_protocol_tasks
SET priority_tier = 2
WHERE metadata->>'kind' = 'churn_batch' AND priority_tier = 4;
