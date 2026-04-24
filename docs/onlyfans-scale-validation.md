# OnlyFans 1,000-User Load + Chaos Validation

This document defines pre-release validation for inbox/thread reliability, API limit safety, and webhook consistency at 1,000 concurrent creators.

## Test objectives

- Validate no silent empty inbox/thread regressions under load.
- Verify bounded retries and stable behavior during 429 bursts.
- Confirm queueing paths drain without starvation for mass messaging.
- Confirm webhook duplicate deliveries are idempotent and consistent.

## Traffic profiles

- **Inbox churn (40%)**
  - `GET /api/messages/inbox?platform=all&segment=all&sort=recent`
  - Every 8-20s per virtual creator.
- **Thread open + refresh (35%)**
  - `GET /api/onlyfans/messages/:fanId?limit=100`
  - 20% of calls use `refresh=1`.
  - Pagination probes with `before` cursor.
- **Mass message bursts (15%)**
  - `POST /api/messages/mass` and `POST /api/onlyfans/messages/mass`
  - Mixed paid/free payloads, media and non-media.
- **Webhook bursts (10%)**
  - `POST /api/onlyfans/webhook`
  - Includes duplicates, delayed retries, and out-of-order events.

## Concurrency model

- Ramp from 100 to 1,000 active creators over 10 minutes.
- Hold 1,000 for 30 minutes.
- Spike to 1,250 for 5 minutes to test headroom.
- Cooldown to 200 for 5 minutes.

## Chaos injections

- Inject synthetic 429/503 responses at edge proxy for 5-minute windows.
- Add random latency (p95 +300ms, p99 +1.2s) for upstream OnlyFans calls.
- Drop 3% webhook deliveries; replay duplicates after 1-5 minutes.
- Force partial provider failures (OnlyFans unavailable, Fansly healthy) and inverse.

## Acceptance criteria (must pass)

- **Inbox reliability**
  - `GET /api/messages/inbox` success rate >= 99.0%.
  - `meta.degraded` present whenever provider failure occurs.
  - No responses where conversations are empty due only to hidden provider errors.
- **Thread reliability**
  - `GET /api/onlyfans/messages/:fanId` success rate >= 99.2%.
  - On upstream failure, stale/cache responses return explicit stale indicators.
  - UI keeps last-known thread data on transient failures (no false-empty flash).
- **Rate-limit compliance**
  - 429 ratio remains <= 3% during steady-state (excluding injected chaos windows).
  - Retries remain bounded (no unbounded loops; no request storms after 429).
- **Mass messaging**
  - Queue completion >= 99% for campaigns under test envelope.
  - No starvation: oldest queued campaign start latency p95 <= 90s.
- **Webhook correctness**
  - Duplicate deliveries do not create duplicate side-effects.
  - Ledger transitions reach terminal state (`processed` or `failed`) for >= 99.9% of received events.
  - Data consistency checks between webhook side-effects and read models >= 99.9%.

## Observability requirements for test run

- Capture:
  - per-route success rate,
  - p50/p95/p99 latency,
  - 429/5xx rates,
  - cache-fallback ratio,
  - webhook ledger status counts.
- Fail run if any SLO gate above is violated.

## Sign-off checklist

- Run baseline (no chaos) and chaos variants.
- Produce run artifacts (metrics dashboard exports + raw logs).
- Attach top regressions and remediation notes before production rollout.
