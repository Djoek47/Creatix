# Markit V5 Execution Brief

## Scope and ownership

- Markit/Frame surface owns editor UX, workflow pages, and orchestration UX.
- Creatix owns Ariadne service contracts, embed/detect processing, storage lineage, and evidence APIs.
- Integration must remain contract-first: Markit calls Creatix through existing Ariadne routes and signed/authorized bridges.

## In-scope now

1. Architecture split of `frame-editor` into domain modules (export, trace/detect, AI assist, timeline-ready state boundaries).
2. Four-step V5 journey foundation (setup -> edit -> export -> detect) with state-safe routing.
3. Timeline contract scaffolding and serialization guardrails.
4. Export orchestration hardening (idempotent job intent + metadata lineage continuity).
5. Detect UX alignment to Ariadne match semantics and evidence actions.

## Deferred hardening

- Full ffmpeg graph parity for all advanced edits and effects.
- Broad multi-format optimization/performance tuning.
- Full Divine editor action expansion beyond currently safe allowlist.

## Non-negotiables

- No reimplementation of Ariadne engine logic in Markit surface code.
- Keep vault bridge and authorization semantics backward compatible.
- Preserve existing frame-editor happy path while refactoring.
- All user-facing capability additions must be feature-flag gated.

## Rollout and rollback matrix

| Capability | Flag | Default | Rollback |
| --- | --- | --- | --- |
| Traced export panel | `NEXT_PUBLIC_FRAMER_TRACED_EXPORT_ENABLED` | off in new envs | Disable flag |
| AI assist panel | existing route + auth checks | on where configured | Route fallback to manual mode |
| Detect workflow | tied to traced export flag | off in new envs | Disable flag |

## Initial risks and mitigation owners

1. Timeline contract churn before render integration.
   - Mitigation: schema freeze checkpoint before ffmpeg and batch export work.
2. Preview/export drift.
   - Mitigation: deterministic serialization and fixture-based regression tests.
3. Cross-surface auth regression.
   - Mitigation: keep existing `importUrl/exportToken` flow unchanged while extracting modules.

## Execution order

1. Phase 0 lock (this brief) and domain boundaries.
2. Phase 1-2 refactor and UI primitive standardization.
3. Phase 3-6 workflow and export orchestration.
4. Phase 7-9 Divine expansion, profile exports, detect completion.
5. Phase 10-11 env/test/release gating.

## Release operations

- Use `docs/markit-v5-release-checklist.md` as the operational runbook for preflight, flag rollout, smoke tests, and rollback.
- Use `docs/markit-v5-acceptance-signoff.md` to capture final acceptance decisions per release candidate.

## Latest verification snapshot

- `frame-editor` local verification status (latest run in this branch):
  - `npm test` -> pass (`15` files, `59` tests)
  - `npm run build` -> pass (Next.js production build completed, routes generated)
- Use this as a quick readiness signal; final ship/no-ship still requires release checklist + acceptance sign-off completion.

## Remaining slice status snapshot

Legend: `done` = implemented and verified in current branch, `partial` = foundational work shipped but deeper parity remains, `pending` = not yet implemented.

| Slice | Status | Notes |
| --- | --- | --- |
| Focus clip -> export payload linkage | done | Focused clip metadata is carried through trace/render lineage and idempotency keys. |
| Detect flow completion parity | done | Match-state UX, confidence semantics, evidence actions, cooldown/retry messaging, and bridge modes implemented. |
| Real library/vault data binding | done | Library/vault views consume persisted project, trace, and render history sources. |
| Simple/Pro behavior deepening | done | Advanced clip inspector controls are now Pro-only while Simple keeps lightweight scene-level editing with upgrade guidance. |
| Image-context timeline rules | done | Import rules enforce required lanes, image defaults are deterministic, and Assist now exposes image-duration inspector presets. |
| Export format profile hardening | done | Format/aspect profile mapping and lineage tags are wired and contract-aligned. |
| Signed client contract parity | done | Trace/detect/render request shape and idempotency behavior normalized; render legacy fallback retained. |
| Divine integration slice | done | Divine action contract is complete for current release: typed action stream (project/export/aspect/trace recipient set+clear/trace batch set+clear/focus clip/image duration/clip trim/clip crop), approval gate, signed-envelope checks, replay protection, audit trail tooling, and UI integration coverage are shipped. |
| Feature-flag gating pass | done | Vault, trace/render ops, and Divine surfaces are runtime-flag controlled. |
| Rate-limit + safety UX for detect | done | Cooldown state, bridge token hygiene, fallback notices, and recovery UX implemented. |
| Test suite slices | done | Vitest now covers parser/applier/render contract/audit utilities, timeline image-duration mutation, Divine batch recipient normalization/caps, Divine payload->preview->apply contract flow, shared trace triage recipient-filter helpers, runtime trace batch normalization, trace history projection semantics, run-ledger hydration/cap behavior, trace-ledger continuity, and UI-level integration coverage for TracePanel filtering plus DivineActionPanel preview/apply and nonce replay guard flows. |
| Docs + release checklist | done | Execution brief, release checklist, and acceptance sign-off template are linked and ready for release operations. |

## Truly open slices

No required slices remain for the current Markit V5 plan scope in this branch.

Optional future investments (not blockers for current release):

| Slice | Scope | Owner | Target date | Status |
| --- | --- | --- | --- | --- |
| Browser-level route e2e depth | Component-level integration coverage exists for TracePanel and DivineActionPanel; full route-transition/browser e2e journeys remain optional hardening. | QA / Automation owner | Next hardening sprint (TBD) | Optional |

