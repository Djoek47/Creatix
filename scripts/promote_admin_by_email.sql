-- Promote an existing user to admin by email.
-- Prereq: user exists in auth.users and public.profiles (signup / invite completed).
--
-- 1) Replace the email below.
-- 2) Run in Supabase Dashboard → SQL Editor.

UPDATE public.profiles
SET
  role = 'admin',
  updated_at = now()
WHERE lower(trim(email)) = lower(trim('REPLACE_WITH_YOUR_EMAIL@example.com'));

-- Optional: confirm
-- SELECT id, email, role, updated_at FROM public.profiles WHERE role = 'admin';
