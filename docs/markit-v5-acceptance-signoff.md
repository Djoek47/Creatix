# Markit V5 Acceptance Sign-off

Use this file as the final acceptance record for a Markit V5 release candidate.  
Fill one section per candidate/deployment attempt.

---

## Candidate

- Release candidate ID:
- Commit SHA:
- Environment: Preview / Production
- Date/time window:
- Release owner:
- QA owner:
- Rollback owner:

## Feature-flag snapshot

- `NEXT_PUBLIC_FRAMER_TRACED_EXPORT_ENABLED`:
- `NEXT_PUBLIC_MARKIT_VAULT_LIVE_DETECT_ENABLED`:
- `NEXT_PUBLIC_MARKIT_VAULT_BRIDGE_RECOVERY_ENABLED`:
- `NEXT_PUBLIC_MARKIT_TRACE_OPERATIONS_ENABLED`:
- `NEXT_PUBLIC_MARKIT_RENDER_QUEUE_ENABLED`:
- `NEXT_PUBLIC_MARKIT_DIVINE_ACTIONS_ENABLED`:
- `NEXT_PUBLIC_MARKIT_DIVINE_REQUIRE_SIGNED_ENVELOPE`:

## Automated checks

- `npm test` result:
- `npm run build` result:
- Additional CI checks:
- Verification snapshot reference (`docs/markit-v5-execution-brief.md` -> `Latest verification snapshot`):

## Manual smoke verification

- [ ] Editor launch via bridge link succeeds.
- [ ] Simple/Pro mode routing and guardrails behave as expected.
- [ ] Trace export flow succeeds and payload IDs appear in ledger.
- [ ] Render queue flow succeeds and run metadata is recorded.
- [ ] Vault detect flow matches expected state behavior (`Live`/`Fallback`/`Expired` etc.).
- [ ] Evidence packet actions work.
- [ ] Divine panel (if enabled) passes preview/apply + nonce replay protections.
- [ ] Divine behavior remains within scoped action contract for this release (project/export/aspect/trace controls/focus/image duration/clip trim/clip crop only).

## Contract parity spot-check

- [ ] Trace embed request shape verified.
- [ ] Detect request shape verified.
- [ ] Render request shape verified (including focused clip lineage behavior).
- [ ] Idempotency keys observed and deterministic.

## Open issues / deviations

- Issue:
  - Severity:
  - Owner:
  - Mitigation:

## Decision

- Decision: Approve / Reject
- Approved by:
- Approval timestamp:
- Notes:
  - Confirm deferred scope remains deferred: broader high-impact Divine mutations (for example bulk timeline reordering/deletion or multi-clip graph edits) are not part of this candidate unless explicitly approved.

## Rollback readiness confirmation

- [ ] Flag-first rollback plan validated.
- [ ] Previous known-good deployment identified.
- [ ] On-call/owner availability confirmed for first production hour.
