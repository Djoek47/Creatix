# Ariadne Privacy + Security Checklist

## Payload privacy

- [x] Payload v2 excludes raw recipient identity.
- [x] Payload includes opaque reference and signed linkage hash only.
- [x] Recipient linkage stored in authority DB (`ariadne_payload_links`).

## Access control

- [x] Ownership checks enforced on export and detect endpoints.
- [x] Evidence endpoints require signed-in user and scoped row ownership.
- [x] Signed service auth includes nonce + timestamp + idempotency key.

## Storage and transport

- [x] Storage access uses short-lived signed URLs.
- [x] Evidence records include immutable hashes and timeline events.
- [ ] Sensitive metadata encryption-at-rest policy finalized with ops/legal.

## Abuse and replay protection

- [x] Replay protection via nonce registry.
- [x] Idempotency cache for write endpoints.
- [x] Invalid signature and expired marker states classified explicitly.

## Audit readiness

- [x] Detect events and trace exports persist structured metadata.
- [x] Legal confidence policy documented in `docs/ariadne-detection-confidence-policy.md`.
- [ ] Retention + redaction SOP documented for long-term legal discovery.

