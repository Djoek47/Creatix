# Markit V5 Release Checklist

## 1) Preflight

- [ ] Confirm target branch includes latest Markit V5 slices (`frame-editor` workflow, vault hardening, Divine safety rails, tests).
- [ ] Confirm environment variables are present for the deployment target (Preview/Production as needed).
- [ ] Run local verification:
  - `cd frame-editor`
  - `npm test`
  - `npm run build`
- [ ] Cross-check `docs/markit-v5-execution-brief.md` -> `Latest verification snapshot` matches current candidate commit (or re-run and refresh snapshot).

## 2) Required/optional flags

Set these in deployment environment before rollout:

- `NEXT_PUBLIC_FRAMER_TRACED_EXPORT_ENABLED`
  - Enables traced export + detect surfaces in editor flow.
- `NEXT_PUBLIC_MARKIT_VAULT_LIVE_DETECT_ENABLED`
  - Enables live `/api/ariadne/detect` use in vault panel.
- `NEXT_PUBLIC_MARKIT_VAULT_BRIDGE_RECOVERY_ENABLED`
  - Enables reconnect bridge recovery UI in vault panel.
- `NEXT_PUBLIC_MARKIT_TRACE_OPERATIONS_ENABLED`
  - Enables trace export operations in Ariadne panel.
- `NEXT_PUBLIC_MARKIT_RENDER_QUEUE_ENABLED`
  - Enables render queue operations/retries in Ariadne panel.
- `NEXT_PUBLIC_MARKIT_DIVINE_ACTIONS_ENABLED`
  - Enables Divine action stream panel in editor.
- `NEXT_PUBLIC_MARKIT_DIVINE_REQUIRE_SIGNED_ENVELOPE`
  - If `true`, Divine payloads must use signed envelope (`version/source/issuedAt/nonce/actions`).

## 3) Contract parity checks

- [ ] Trace embed requests include:
  - `Authorization: Bearer <token>`
  - `x-idempotency-key`
  - `lineage.encoderProfile`, `lineage.planHash`, and focused clip metadata when present.
- [ ] Detect requests include:
  - `Authorization: Bearer <token>`
  - `x-idempotency-key` with content + file identity components.
- [ ] Render bridge requests include:
  - Canonical `lineage.focusedClip` payload (legacy top-level fallback still accepted server-side).
  - Deterministic render idempotency key shape (`frame_render:...`).

## 4) Manual smoke test (operator path)

- [ ] Open editor via vault bridge link.
- [ ] Verify setup/edit/export/detect routing and mode switch (`simple`/`pro`).
- [ ] Queue one render with recipient key; verify ledger entry and status.
- [ ] Run trace export; verify payload ID appears in trace ledger.
- [ ] In `/vault`, upload leak sample:
  - verify bridge badge state (`Live`/`Fallback`/`Expired`/etc.),
  - verify cooldown UX and notices,
  - verify evidence packet action.
- [ ] In Divine panel (if enabled):
  - run preview and apply with approval gate,
  - verify signed envelope validation (if required),
  - verify nonce replay block,
  - verify audit trail export/filter/search/sort flows,
  - verify scoped action set only (project/export/aspect/trace controls/focus/image duration/clip trim/clip crop).

## 5) Rollout order

1. Deploy with conservative defaults (keep high-risk flags off).
2. Enable vault live detect flags in Preview; validate smoke path.
3. Enable trace/render operation flags in Preview; validate ledgers/retries.
4. Enable Divine actions (and optionally signed-envelope requirement) in Preview.
5. Promote to Production.

Note: current release scope intentionally excludes broader high-impact Divine mutations (for example bulk timeline reordering/deletion or multi-clip graph edits) unless separately approved.

## 6) Rollback playbook

Use flag-first rollback before code rollback:

- Disable `NEXT_PUBLIC_MARKIT_DIVINE_ACTIONS_ENABLED` to remove Divine mutation surface.
- Disable `NEXT_PUBLIC_MARKIT_VAULT_LIVE_DETECT_ENABLED` to force local detect simulation.
- Disable `NEXT_PUBLIC_MARKIT_TRACE_OPERATIONS_ENABLED` and/or `NEXT_PUBLIC_MARKIT_RENDER_QUEUE_ENABLED` to freeze advanced ops.
- Disable `NEXT_PUBLIC_FRAMER_TRACED_EXPORT_ENABLED` for broad traced-workflow rollback.

If behavior still regresses after flag rollback, revert deployment to previous known-good build.

## 7) Release sign-off

- [ ] Tests and build green on release commit.
- [ ] `Latest verification snapshot` in `docs/markit-v5-execution-brief.md` is current for release candidate SHA.
- [ ] Flags captured in deployment notes.
- [ ] Smoke results captured (who ran, when, environment, pass/fail notes).
- [ ] Rollback owner assigned for first production hour.
- [ ] Acceptance record completed in `docs/markit-v5-acceptance-signoff.md`.
