# OnlyFans Throttle + Retry Policy

`lib/onlyfans-request-policy.ts` is the shared request policy layer for `lib/onlyfans-api.ts`.

## What it enforces

- Global concurrency cap (`ONLYFANS_GLOBAL_MAX_CONCURRENCY`, default `40`).
- Global safety request-per-second envelope (`ONLYFANS_GLOBAL_SAFETY_RPS`, default `90`).
- Per-account pacing derived from known/minimum RPM (`ONLYFANS_RATE_LIMIT_PER_MINUTE`, default `1000`), then updated from response headers.
- Bounded retries (`ONLYFANS_MAX_RETRIES`, default `3`) for `429`, `408`, and `5xx`.
- `retry-after` support for backoff windows.
- Per-call timeout (`ONLYFANS_REQUEST_TIMEOUT_MS`, default `8000`).

## Per-instance limits (multi-tenant scaling)

`ONLYFANS_GLOBAL_SAFETY_RPS` and pacing derived from `ONLYFANS_RATE_LIMIT_PER_MINUTE` apply **per serverless isolate** (each Vercel function instance), not as a single global cap across all users or all instances. Under many concurrent users, aggregate traffic to the partner proxy can still spike unless you:

- Lower these env values for conservative deployments, or
- Add a central limiter (for example Redis) in a later phase if you need a true cross-instance budget.

For large tenant counts, treat defaults as a starting point and validate with staging metrics.

## Vendor semantics (maintainers)

- Partner documentation: use the vendor **llms-full** and **API reference** for endpoint cache behavior (`?fresh=true` vs default cache), response `_meta`, and account limits.
- Limits are expressed as **requests per minute (RPM)** for tiers (for example Basic vs Pro); there is **no** documented daily partner cap in the usual API surface—operational throttling still appears as **429** and **`retry-after`**.
- Routine list/sync paths (inbox, notifications) should **not** force `fresh=true` unless the user explicitly refreshes.

## Load testing

- Run load tests (for example `tests/load/onlyfans-1k-scenarios.k6.js`) only against **staging** credentials and environments so production partner quotas and real creator sessions are not stressed unintentionally.

## Header-aware adaptation

When upstream sends `x-rate-limit-limit-minute`, `x-rate-limit-remaining-minute`, `x-rate-limit-reset-minute`, or `retry-after`, the account-level policy state is updated in-memory and applied to subsequent calls in that runtime instance. When responses include `_meta._rate_limits`, you can prefer fields like `remaining_minute` for metrics or adaptive backoff in addition to headers.

## Error contract

- `lib/onlyfans-api.ts` now throws `ONLYFANS_RATE_LIMIT:...` for 429 responses.
- Session expiry remains `ONLYFANS_SESSION_EXPIRED:NEEDS_REAUTHENTICATION`. Accounts with `is_authenticated: false` from the partner need re-auth; keep UI/session-expiry flows aligned with existing `ONLYFANS_SESSION_EXPIRED` handling.
- Existing route handlers can map these to structured status responses (429 / reconnect CTA).

## Current scope

- All requests that go through `OnlyFansAPI.request(...)` and `OnlyFansAPI.requestGlobal(...)` use the shared policy.
- This covers inbox, chat, mass messaging, notifications, analytics, and most account-scoped operations.

## Related server-side coalescing

- `GET /api/messages/inbox` uses cached `getConversations` (`/chats`) with min-refresh, TTL, rate-limit cooldown, and singleflight (`lib/onlyfans-inbox-chats-cache.ts`). Clients can pass `refresh=true` to bypass min-refresh when the user explicitly reloads the list.
- `GET /api/onlyfans/conversations` and `GET /api/onlyfans/notifications` apply similar min-refresh and stale-return patterns.
