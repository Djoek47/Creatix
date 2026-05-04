# OnlyFans Webhook Idempotency Contract

Operator setup (URL, signing secret, Vercel env, event checklist): **[onlyfans-api-webhook-setup.md](./onlyfans-api-webhook-setup.md)**.

## Ingest contract

- Endpoint: `POST /api/onlyfans/webhook`
- Production requires valid `x-onlyfans-signature` and configured `ONLYFANS_WEBHOOK_SECRET`.
- Event identifier:
  - Prefer `event.id`, then `event.event_id`, then `event.data.event_id`, then `event.data.id`.
  - If missing, fallback key is `eventType + sha256(rawPayload)`.

## Event ledger

- Backed by `public.platform_webhook_event_ledger` (migration: `scripts/088_onlyfans_webhook_event_ledger.sql`).
- Unique key: `(platform, event_id)`.
- Lifecycle statuses:
  - `received` at first reservation,
  - `processed` when async handler completes,
  - `failed` when async handler throws (with truncated error text).

## Delivery behavior

- Duplicate delivery:
  - If ledger insert conflicts, request is treated as already handled and returns `{ received: true, duplicate: true }`.
- First delivery:
  - Request is acknowledged quickly with `{ received: true, queued: true }`.
  - Heavy work is deferred using `after(...)` for async processing.

## Worker behavior

- Async processor routes by `eventType` and invokes existing handlers.
- On success/failure, ledger row is updated with terminal status.
- This keeps inbound webhook responsiveness high while preserving delivery auditability and dedupe guarantees.
