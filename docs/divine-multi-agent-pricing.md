# Divine Manager: concurrent sessions and pricing (product + engineering)

## Product intent

- Block **two simultaneous Divine Manager sessions** on two devices for the same account unless a paid **extra agent** add-on is active.
- **Illustrative pricing ladder** (billing design only; not wired to Stripe in this repo):

  | Tier (example) | Monthly | Concurrent Divine agents |
  |----------------|---------|---------------------------|
  | Starter        | $50     | 1                         |
  | Growth         | $150    | 2                         |
  | Scale          | $300    | 3                         |

- Coordination when multiple agents are allowed: task queue, partition by `fan_id`, or claim rows so two agents do not message the same fan at once.

## Engineering stub (optional)

- **Env**
  - `DIVINE_ENFORCE_SESSION_LEASE` — set to `true` to enforce a single active client session id per user (requires DB table).
  - `DIVINE_MAX_CONCURRENT_SESSIONS` — default `1`; values `> 1` disable the strict single-lease check until full entitlement logic exists.

- **Database**: `scripts/038_divine_session_leases.sql` creates `divine_session_leases` (`user_id`, `session_id`, `expires_at`).

- **API**: `POST /api/ai/divine-manager-chat` and `POST /api/ai/divine-manager-realtime` accept optional `divine_session_id` (browser `sessionStorage` id from `getOrCreateDivineSessionId()` in `lib/divine/divine-client-session-id.ts`). When enforcement is on, a second distinct id returns **403** with an upgrade-oriented message. The Expo app should send the same field once a stable per-install id is wired; until then it omits the field and the stub does not apply the lease on those requests.

- **Production**: replace or extend the lease table with proper heartbeats, Stripe entitlements, and support for `DIVINE_MAX_CONCURRENT_SESSIONS` matching the paid tier.
