# Handoff: switch to another PC

Use this so you can **`git pull`** elsewhere and know what’s current, what’s optional to undo, and what’s left to build.

## Sync on the new machine

```bash
# If you already cloned:
cd Creatix
git fetch origin
git checkout CetV
git pull origin CetV

# Fresh clone:
git clone https://github.com/Djoek47/Creatix.git
cd Creatix
git checkout CetV
```

**Active branch:** `CetV` (tracks `origin/CetV`).

**Last pushed commit at time of writing:** `30f9de2` — *fix(db): single auth signup trigger; Supabase admin docs; pricing SEO + calculator*

Run `git log -1 --oneline` after pull to confirm you match remote.

## Install & build (this repo uses pnpm)

Use the **Node version** in the repo root [`.nvmrc`](../.nvmrc) (`nvm use`, `fnm use`, or install that major version).

```bash
corepack enable && corepack prepare pnpm@9.15.4 --activate
pnpm install
pnpm run build   # optional sanity check
```

If you only have npm: `npx pnpm@9.15.4 install` (lockfile is `pnpm-lock.yaml`).

**Line endings:** [`.gitattributes`](../.gitattributes) keeps source files as **LF**. After cloning on Windows, avoid turning off `core.autocrlf` overrides that fight the repo — default Git behavior with this file is fine.

**Bash scripts** (`scripts/*.sh`): on Windows, use Git Bash or WSL. On Unix, `chmod +x scripts/push-all.sh` if your clone lost the executable bit.

## Supabase / DB (do on the Supabase project, not only on PC)

1. If signup still fails: run **`scripts/064_fix_auth_signup_profile_and_subscription.sql`** in SQL Editor.
2. Admin user: **`docs/internal/SUPABASE_ADMIN_SETUP.md`** + **`scripts/promote_admin_by_email.sql`**.
3. Migrations order reference: **`scripts/README_MIGRATIONS.md`**.

## “Undo” / rollback notes (be careful)

| Change | Undo idea |
|--------|-----------|
| **064 / new `handle_new_user`** (single trigger, profile + subscription) | Prefer **Supabase backup restore** if you must revert. Manually re-splitting triggers is error-prone; keep a backup before running 064. |
| **010 file in git** (updated for greenfield installs) | Already merged on `CetV`; don’t “undo” in git without a new migration that restores old behavior. |
| **Local uncommitted work** | Stash before leaving: `git stash push -u -m "wip"` then `git stash pop` on other PC (after pull). |

There is **no** repo script that drops `public` schema—avoid experimental wipes without a backup.

## Planned / unfinished product work (pick up later)

Documented in **`docs/internal/TIER_TRANSITION_PLAN.md`**:

- Automatic revenue → tier evaluation (cron / Stripe next period).
- Optional: per-platform revenue rule (max/sum/primary)—not implemented.
- Tier-up **congratulations** (in-app / email)—not implemented.

Pricing **calculator** + SEO JSON-LD live on **`/pricing`** (`components/marketing/pricing-page-calculator.tsx`, etc.).

## Env you’ll need on the new PC

Copy from Vercel / your secrets manager: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, Stripe, `NEXT_PUBLIC_APP_URL` / `APP_URL`, optional `ADMIN_IP_ALLOWLIST`.

## Quick file index for recent work

| Area | Path |
|------|------|
| Signup fix (repair SQL) | `scripts/064_fix_auth_signup_profile_and_subscription.sql` |
| Subscriptions + trigger (base chain) | `scripts/010-create-subscriptions-table.sql` |
| Pricing math | `lib/pricing-matrix.ts` |
| Admin | `docs/internal/SUPABASE_ADMIN_SETUP.md`, `docs/internal/ADMIN_USAGE_AND_COSTS.md` |
