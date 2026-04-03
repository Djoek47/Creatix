# SQL migrations (Creatix / Circe et Venus)

Incremental Postgres migrations live in this folder. **Order matters** for a new database.

## Quick fix: signup broken

Run **`064_fix_auth_signup_profile_and_subscription.sql`** first on an existing Supabase project if **new Auth users fail** (missing `profiles` / `subscriptions` rows or trigger errors).

## Full apply order (greenfield)

1. Prefer starting from **`001_create_schema.sql`** (full base schema + first `handle_new_user` trigger).
2. Apply remaining files in **numeric prefix order** (`002_…`, `004_…`, … `063_…`, then **`064_…`**).
3. When two files share a number (e.g. `019_…` twice), apply both before moving to the next number.
4. One-off scripts without numbers (`add-onboarding-column.sql`, `create-dmca-claims-table.sql`, etc.) should be applied after the numbered chain if your project never ran them (check table/column existence first).

## Duplicated numeric prefixes

Some numbers appear twice (e.g. `046`, `047`, `051`, `019`). Treat them as **same “step group”**: run **all** files for that number before `050`, etc.

## Not a single consolidated dump

We intentionally **do not** replace this folder with one mega-SQL file in git: production databases are already on the chain; a single dump would fork history. Use **`064`** + docs for repairs, and Supabase **backups** for true resets.
