# Ariadne Trace — technical specification (MVP)

## Purpose

Per-recipient **forensic traceability** for vault-exported video: embed a signed payload so Creatix can map a recovered file back to a **recipient key** and **export record** for DMCA and leak workflows.

## MVP algorithm (`append-v1`)

1. After export encoding, append a binary marker to the file:
   - Magic: UTF-8 `CREATIX_ARID:v1:`
   - Payload: JSON `{ payloadId, recipientKey, contentId, userId, exp, sig }` where `sig` is HMAC-SHA256 over canonical fields using `ARIADNE_SECRET` (falls back to `FRAME_BRIDGE_SECRET` if unset).
2. Store a row in `ariadne_exports` with `file_sha256_before`, `file_sha256_after`, `algorithm_version: append-v1`, `source: vault_standalone | frame_export`.

## Detection (`append-v1`)

1. Read uploaded bytes; search for the last occurrence of `CREATIX_ARID:v1:`.
2. Parse JSON; verify HMAC and `exp`.
3. Join to `ariadne_exports` by `payload_id` / `content_id`.
4. Persist detect run metadata in `ariadne_detect_events` (`none` | `unregistered` | `registered`) for evidence timelines.

## Service contract (`v1.1`)

- Service-to-service calls (Markit -> Creatix) use signed headers:
  - `x-ariadne-contract-version: v1.1`
  - `x-creatix-service`, `x-creatix-timestamp`, `x-creatix-nonce`, `x-idempotency-key`, `x-creatix-signature`
- Replay protection:
  - nonce persisted in `ariadne_service_nonces`
  - timestamp replay window defaults to 5 minutes (`ARIADNE_SERVICE_REPLAY_WINDOW_SEC`)
- Idempotency:
  - write endpoints cache prior responses in `ariadne_idempotency_keys`
  - repeated idempotency keys return the same payload without creating duplicate forensic rows

## Limitations

- Appended bytes may be stripped by some re-encoders or hosts. **v2** (planned) uses spread-spectrum / coefficient-domain embedding for higher robustness.
- Marketing copy must not claim “invisible to all AI” — use “designed for detection in the Creatix pipeline.”

## DMCA integration

- Leak scanner or manual upload can call `POST /api/ariadne/detect` with the suspected file.
- On match, surface `recipient_key` and `content_id` for the creator and optional pre-fill for DMCA draft context.
- Evidence retrieval is available at `GET /api/ariadne/exports/:id/evidence` with hash chain + detect timeline.
