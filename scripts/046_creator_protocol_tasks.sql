-- Protocol / daily tasks for Divine rail + CRM linkage. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.creator_protocol_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'executing', 'done', 'failed')),
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'webhook', 'divine')),
  linked_notification_id uuid REFERENCES public.notifications (id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_protocol_tasks_user
  ON public.creator_protocol_tasks (user_id);

CREATE INDEX IF NOT EXISTS idx_creator_protocol_tasks_user_status
  ON public.creator_protocol_tasks (user_id, status);

CREATE INDEX IF NOT EXISTS idx_creator_protocol_tasks_linked_notification
  ON public.creator_protocol_tasks (linked_notification_id)
  WHERE linked_notification_id IS NOT NULL;

ALTER TABLE public.creator_protocol_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creator_protocol_tasks_select_own" ON public.creator_protocol_tasks;
DROP POLICY IF EXISTS "creator_protocol_tasks_insert_own" ON public.creator_protocol_tasks;
DROP POLICY IF EXISTS "creator_protocol_tasks_update_own" ON public.creator_protocol_tasks;
DROP POLICY IF EXISTS "creator_protocol_tasks_delete_own" ON public.creator_protocol_tasks;

CREATE POLICY "creator_protocol_tasks_select_own" ON public.creator_protocol_tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "creator_protocol_tasks_insert_own" ON public.creator_protocol_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "creator_protocol_tasks_update_own" ON public.creator_protocol_tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "creator_protocol_tasks_delete_own" ON public.creator_protocol_tasks
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.creator_protocol_tasks IS 'Creator protocol and daily tasks; optional link to notifications row.';
