# Ariadne + Markit E2E checklist

Use this checklist for legal-grade workflow validation from render to evidence.

## Preconditions

- `MARKIT_ARIADNE_SERVICE_MODE=true`
- `ARIADNE_SERVICE_AUTH_ENFORCED=true`
- Markit and Creatix share `MARKIT_ARIADNE_SHARED_SECRET`
- Test creator account has sufficient AI credits

## Scripted smoke

Run:

`pnpm run test:ariadne-markit-e2e-smoke`

Required env:

- `ARIADNE_E2E_BASE_URL`
- `ARIADNE_E2E_CONTENT_ID`
- `ARIADNE_E2E_DETECT_FILE`
- optional `ARIADNE_E2E_RECIPIENT_KEY`

## Manual legal-evidence drill

1. Produce traced export in Markit (service call to `POST /api/ariadne/embed`).
2. Confirm canonical row in `ariadne_exports` with:
   - `payload_id`
   - `job_id`, `pipeline_version`, `encoder_profile`
   - `file_sha256_before`, `file_sha256_after`
3. Upload distributed/leaked sample to `POST /api/ariadne/detect`.
4. Confirm one row in `ariadne_detect_events`.
5. Fetch `GET /api/ariadne/exports/:id/evidence`.
6. Confirm credit ledger single-debit behavior:
   - one `ariadne_trace` debit
   - one `ariadne_detect` debit
   - no duplicate debit rows for same idempotency key.

## Failure criteria

- Duplicate `ariadne_exports` rows for same idempotency key.
- Replay nonce accepted.
- Missing evidence hash chain for known export id.
- Double debit for one trace or one detect execution.
