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

## Limitations

- Appended bytes may be stripped by some re-encoders or hosts. **v2** (planned) uses spread-spectrum / coefficient-domain embedding for higher robustness.
- Marketing copy must not claim “invisible to all AI” — use “designed for detection in the Creatix pipeline.”

## DMCA integration

- Leak scanner or manual upload can call `POST /api/ariadne/detect` with the suspected file.
- On match, surface `recipient_key` and `content_id` for the creator and optional pre-fill for DMCA draft context.
