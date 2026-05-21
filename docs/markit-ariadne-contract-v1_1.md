# Markit <-> Creatix Ariadne Contract (`v1.1`)

This contract defines how Markit calls Creatix Ariadne APIs while Creatix remains the authority for attribution and evidence.

**V4 integration** (rollout label, same `v1.1` headers): see [`markit-ariadne-v4.md`](./markit-ariadne-v4.md) for actor binding, user-scoped idempotency, embed credit bypass for M2M, and Frame detect CORS/token.

## Base

- Base URL: `https://<creatix-host>/api/ariadne`
- Contract header: `x-ariadne-contract-version: v1.1`
- Content type:
  - `POST /embed`: `application/json`
  - `POST /detect`: `multipart/form-data`
- Auth modes:
  - **User session/Bearer** (interactive dashboard calls)
  - **Service auth** (Markit service-to-service)

## Service Auth (`v1.1`)

Service calls must send all headers below:

- `x-creatix-service`: service id (`markit`)
- `x-creatix-timestamp`: unix seconds
- `x-creatix-nonce`: unique random nonce
- `x-idempotency-key`: unique idempotency key per write intent
- `x-creatix-signature`: HMAC SHA-256 (hex)
- `x-creatix-actor-user-id`: UUID of the creator account to scope reads/writes

Signature input (exact pipe-delimited order):

`<METHOD>|<PATHNAME>|<x-creatix-timestamp>|<x-creatix-nonce>|<x-idempotency-key>|<body_sha256_hex>`

Where `body_sha256_hex` is:

- JSON body bytes SHA-256 for `POST /embed`
- raw multipart bytes SHA-256 for `POST /detect` (or empty string if unavailable)

Security requirements:

- Replay window: default 5 minutes (`ARIADNE_SERVICE_REPLAY_WINDOW_SEC`)
- Nonce single-use (persisted and rejected on reuse)
- Idempotency key required for all write operations

## `POST /api/ariadne/embed`

Creates a traced export and canonical `ariadne_exports` row.

### Request JSON (`v1.1`)

```json
{
  "contentId": "uuid",
  "recipientKey": "string",
  "source": "vault_standalone | frame_export | message_send | mass_dm",
  "recipient": {
    "fanId": "uuid?",
    "platform": "onlyfans | fansly | mym?",
    "platformFanId": "string?",
    "username": "string?",
    "displayName": "string?"
  },
  "origin": {
    "messageId": "string?",
    "massBatchId": "string?"
  },
  "lineage": {
    "jobId": "string?",
    "pipelineVersion": "string?",
    "encoderProfile": "string?"
  },
  "updateContentRow": true
}
```

### Response 200

```json
{
  "success": true,
  "payloadId": "string",
  "exportId": "uuid",
  "algorithmVersion": "append-v1",
  "downloadUrl": "https://...",
  "creditsCharged": 0,
  "source": "frame_export",
  "contentId": "uuid",
  "recipientKey": "string",
  "lineage": {
    "jobId": "mk_123",
    "pipelineVersion": "markit-2026-04-21",
    "encoderProfile": "h264-main"
  },
  "billingMode": "service"
}
```

`billingMode` is present on responses: `user_credits` for session/export-token embeds (positive `creditsCharged`), `service` for M2M embeds (`creditsCharged` is `0`).

## `POST /api/ariadne/detect`

Detects marker, logs detect event, and can charge credits once.

### Request

Multipart form-data:

- `file`: required

Optional metadata fields:

- `contentId`
- `suspectedExportId`

### Response Cases

- `match: false` (no marker)
- `match: "unregistered"` (marker decodes, no canonical row for account)
- `match: true` (canonical export found)

## `GET /api/ariadne/exports`

List canonical exports for the resolved actor:

- user session path: signed-in creator
- service-auth path: `x-creatix-actor-user-id`

Query params:

- `limit`, `cursor`, `query`, `source`, `contentId`

## `GET /api/ariadne/exports/:id`

Returns one export + signed download URL (actor-scoped as above).

## `GET /api/ariadne/exports/:id/evidence`

Returns evidence bundle:

- canonical export row
- immutable hash fields
- latest detect events
- signed artifact URL

## Billing semantics

- `POST /api/ariadne/embed`
  - user-session or export-token path: normal Ariadne trace credit usage.
  - service-auth path: billed/controlled by service policy (no end-user credit debit).
- `POST /api/ariadne/detect`
  - user-session path: debits `ariadne-detect`.
  - service-auth path: no end-user credit debit; response includes `billingMode: "service"`.

## Error Contract

Common status codes:

- `400`: invalid request
- `401`: unauthorized/invalid auth
- `402`: insufficient credits
- `409`: replay nonce / duplicate idempotency conflict
- `413`: file too large
- `500`: server error
