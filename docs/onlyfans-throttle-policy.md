# OnlyFans Throttle + Retry Policy

`lib/onlyfans-request-policy.ts` is the shared request policy layer for `lib/onlyfans-api.ts`.

## What it enforces

- Global concurrency cap (`ONLYFANS_GLOBAL_MAX_CONCURRENCY`, default `40`).
- Global safety request-per-second envelope (`ONLYFANS_GLOBAL_SAFETY_RPS`, default `90`).
- Per-account pacing derived from known/minimum RPM (`ONLYFANS_RATE_LIMIT_PER_MINUTE`, default `1000`), then updated from response headers.
- Bounded retries (`ONLYFANS_MAX_RETRIES`, default `3`) for `429`, `408`, and `5xx`.
- `retry-after` support for backoff windows.
- Per-call timeout (`ONLYFANS_REQUEST_TIMEOUT_MS`, default `8000`).

## Header-aware adaptation

When upstream sends `x-rate-limit-limit-minute`, `x-rate-limit-remaining-minute`, `x-rate-limit-reset-minute`, or `retry-after`, the account-level policy state is updated in-memory and applied to subsequent calls in that runtime instance.

## Error contract

- `lib/onlyfans-api.ts` now throws `ONLYFANS_RATE_LIMIT:...` for 429 responses.
- Session expiry remains `ONLYFANS_SESSION_EXPIRED:NEEDS_REAUTHENTICATION`.
- Existing route handlers can map these to structured status responses (429 / reconnect CTA).

## Current scope

- All requests that go through `OnlyFansAPI.request(...)` and `OnlyFansAPI.requestGlobal(...)` use the shared policy.
- This covers inbox, chat, mass messaging, notifications, analytics, and most account-scoped operations.
