# Supabase: fix signup + make an admin (Creatix)

## 1) If new users fail to register (“Database error”, trigger failed, etc.)

Run **`scripts/064_fix_auth_signup_profile_and_subscription.sql`** in **Supabase Dashboard → SQL → New query → Run**.

That migration:

- Removes the old **two-trigger** setup (`on_auth_user_created` + `on_auth_user_created_subscription`).
- Replaces it with **one** `AFTER INSERT ON auth.users` trigger that creates **`public.profiles`** first, then **`public.subscriptions`** (trial) in the **same** function.
- Turns off **FORCE ROW LEVEL SECURITY** on `profiles` and `subscriptions` (safe default; avoids owner-bypass quirks).

Then retry **Authentication → Users → Add user** (or your app sign-up).

## 2) Promote a user to admin (after they exist)

Users must have a row in **`auth.users`** and **`public.profiles`** (normally created by the trigger above).

### Option A — by email (easiest)

In SQL Editor, replace the email:

```sql
UPDATE public.profiles
SET role = 'admin', updated_at = now()
WHERE lower(trim(email)) = lower(trim('you@yourdomain.com'));

-- Check:
SELECT id, email, role FROM public.profiles WHERE role = 'admin';
```

### Option B — by UUID

Copy the user id from **Authentication → Users**, then:

```sql
UPDATE public.profiles
SET role = 'admin', updated_at = now()
WHERE id = 'PASTE-UUID-HERE';
```

Allowed `role` values are defined on `profiles` (`creator`, `agency`, `admin`).

## 3) Sign in to `/admin`

1. Open **`/admin/login`** on your app origin.
2. Sign in with that Supabase user.
3. If you use **`ADMIN_IP_ALLOWLIST`** on Vercel, your IP must be listed.

## 4) About “resetting all SQL”

This repo keeps **incremental** files under `scripts/` (001, 002, …). Do **not** delete them in git: they document how production evolved.

- **Existing project:** apply **`064`** (and any later numbered scripts you have not run yet).
- **Brand-new Supabase project:** run migrations in **numeric/file order** (see `scripts/README_MIGRATIONS.md`), or restore from a known-good backup.

There is **no** supported “one click wipe public schema” in this repo; use Supabase backup/restore or a new project if you need a clean slate.
