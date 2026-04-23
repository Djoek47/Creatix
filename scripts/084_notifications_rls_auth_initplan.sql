-- RLS: replace auth.uid() with (select auth.uid()) so the auth call is not re-evaluated per row.
-- https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- Applied to: public.notifications, public.notification_preferences

-- notifications
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_own ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
DROP POLICY IF EXISTS notifications_delete_own ON public.notifications;

CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY notifications_insert_own ON public.notifications
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY notifications_delete_own ON public.notifications
  FOR DELETE USING ((select auth.uid()) = user_id);

-- notification_preferences (same initplan pattern)
DROP POLICY IF EXISTS notification_preferences_select_own ON public.notification_preferences;
DROP POLICY IF EXISTS notification_preferences_insert_own ON public.notification_preferences;
DROP POLICY IF EXISTS notification_preferences_update_own ON public.notification_preferences;
DROP POLICY IF EXISTS notification_preferences_delete_own ON public.notification_preferences;

CREATE POLICY notification_preferences_select_own ON public.notification_preferences
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY notification_preferences_insert_own ON public.notification_preferences
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY notification_preferences_update_own ON public.notification_preferences
  FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY notification_preferences_delete_own ON public.notification_preferences
  FOR DELETE USING ((select auth.uid()) = user_id);
