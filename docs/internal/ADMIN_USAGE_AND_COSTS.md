# Admin usage, cost estimates & C&C

Internal reference for **Creatix** admin telemetry (`/admin`), Supabase tables, and how USD estimates are derived.

## Authentication model

- **No separate `admin_users` table.** Admins are normal `auth.users` with `public.profiles.role = 'admin'` (allowed by existing `CHECK (role IN ('creator','agency','admin'))`).
- **Step-by-step (signup fix + promote by email):** see [`SUPABASE_ADMIN_SETUP.md`](./SUPABASE_ADMIN_SETUP.md).
- Promote someone:

  ```sql
  UPDATE public.profiles SET role = 'admin' WHERE id = '<uuid>';
  ```

- **Middleware**: unauthenticated requests to `/admin/*` except `/admin/login` redirect to admin login. Optional **`ADMIN_IP_ALLOWLIST`** (comma-separated IPs): when set, only those IPs may hit `/admin` (see `lib/admin/ip-allowlist.ts`).
- **Rate limit**: `POST /api/admin/login-precheck` records hashed IP rows in `admin_login_attempts` (15m window, default max 40 attempts — `ADMIN_LOGIN_MAX_ATTEMPTS_PER_15M`, salt `ADMIN_LOGIN_RATE_SALT`).
- **Server checks**: every admin server action and `/api/admin/*` route verifies `profiles.role = 'admin'` via the user session. **Service role** is used only inside trusted server code for reads/writes to telemetry tables (never sent to the browser).

## SQL migrations (order)

1. `scripts/062_admin_usage_monitoring.sql` — base tables + RLS enabled with **no** policies (deny via PostgREST; app uses service role).
2. `scripts/063_admin_cc_schema_enhancements.sql` — `total_tokens`, `estimated_usd` precision, `safe_context`, `effective_from`, `admin_login_attempts`, daily/monthly **views**.

If you deployed 062 **before** `safe_context` was added to 062, run 063 so `context` → `safe_context` rename applies.

## Tables (summary)

| Table | Purpose |
|--------|---------|
| `ai_usage_events` | Append-only: `user_id`, `feature` (route/slug), `provider`, `model`, token counts, `total_tokens`, `estimated_usd`, `request_id`, `metadata`. |
| `api_error_logs` | Failed requests / server errors: `route`, `http_status`, `message`, `stack`, `safe_context` (truncated, redacted). |
| `ai_unit_costs` | `model_key` → `usd_per_1m_input` / `usd_per_1m_output`, `effective_from` when the rate was last activated. |
| `admin_audit_log` | Admin actions (e.g. cost edits). |
| `admin_login_attempts` | Rate-limit fingerprint only (`ip_hash`). |

## How `estimated_usd` is calculated

For each event:

\[
\text{USD} = \frac{\text{inputTokens}}{10^6} \times \text{usd\_per\_1m\_input} + \frac{\text{outputTokens}}{10^6} \times \text{usd\_per\_1m\_output}
\]

- Rates are loaded from `ai_unit_costs` by **exact `model` string**; if missing, falls back to `default` row, then in-code defaults (`lib/usage/estimate-cost.ts`).
- This is **internal COGS / attribution**, not necessarily what customers pay (unless product maps credits to the same table).

## Instrumentation

- Prefer **`logUsageEvent({ userId, feature, provider, model, usage })`** (`lib/usage/server-log.ts`). It accepts AI SDK shapes (`inputTokens` / `outputTokens` / `totalTokens`) or OpenAI (`prompt_tokens` / `completion_tokens`).
- **`logApiError`** writes **`safe_context`** via `sanitizeSafeContext` (strips secrets, truncates).
- High-traffic paths instrumented include: **Divine Manager chat** (OpenAI rounds), **DM reply package** (gateway + persona pick), **message suggestions API**, **pricing optimizer** (`streamText` `onFinish`), **AI chatter** compose.

## Aggregates

- Views: `admin_v_user_usage_daily`, `admin_v_user_usage_monthly` (group by user + period).
- Admin UI falls back to bucketing raw events if a view is missing.

## Updating unit rates

1. Open **`/admin/settings`** (or export CSV from Overview).
2. Edit rows; each save sets **`effective_from = now()`** and appends an **`admin_audit_log`** entry.
3. Reconcile model keys with what you log in `model` (e.g. `openai/gpt-4o-mini` vs `gpt-4o-mini`).

## Exports

- `GET /api/admin/export/usage?days=30` — CSV of `ai_usage_events` (admin session required).
