-- Fix Supabase security advisor: SECURITY DEFINER views bypass invoker RLS/permissions.
-- Set security_invoker so access checks use the querying role (service role in admin API).
-- Requires PostgreSQL 15+ (Supabase default).
ALTER VIEW public.admin_v_user_usage_daily SET (security_invoker = true);
ALTER VIEW public.admin_v_user_usage_monthly SET (security_invoker = true);
