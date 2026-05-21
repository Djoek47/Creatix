# Ariadne + Markit V4 (compatibility and rollout)

The **Markit** app (render / editor M2M client) is maintained separately — not in this repo. Upstream: [github.com/Djoek47/markit](https://github.com/Djoek47/markit).

V4 is a **rollout and integration label** for the work described in the implementation plan. The on-wire contract remains `x-ariadne-contract-version: v1.1` (no breaking header bump required for the hybrid auth matrix).

## What V4 adds

- **M2M auth**: service-signed requests with **mandatory** `x-creatix-actor-user-id` for embed, detect, and service reads of exports/evidence.
- **User credit semantics**: `POST /api/ariadne/embed` with service auth does **not** debit the creator's AI wallet (`billingMode: "service"` in JSON); interactive/session paths still debit trace credits.
- **User-scoped idempotency**: idempotency keys are stored as `userId::rawKey` to prevent cross-tenant replay confusion when the same raw key is reused by a worker for two creators.
- **Frame bridge**: `POST /api/ariadne/detect` supports CORS to the Frame origin, `Authorization: Bearer` vault export token (same as embed), and optional `x-idempotency-key`.

## Backward compatibility

- Dashboard and Frame **session / export-token** flows are unchanged, aside from stricter scoping of user idempotency keys.
- **Markit** (the app that calls Creatix) must pass `x-creatix-actor-user-id` on all signed calls; old clients without the header receive `401` with `code: "service_actor_required"`.
- Replays of **pre-V4** idempotency keys (stored without the `userId::` prefix) are not returned after deploy; clients should treat the first new request as the new idempotent baseline.

## Feature flags (Creatix)

| Variable | Role |
|----------|------|
| `MARKIT_ARIADNE_SERVICE_MODE` | Enables signed Markit traffic when `true`. |
| `MARKIT_ARIADNE_SHARED_SECRET` | Shared HMAC secret (Creatix + Markit). |
| `ARIADNE_SERVICE_REPLAY_WINDOW_SEC` | Service timestamp drift window (default 300). |

## References

- Contract: [`markit-ariadne-contract-v1_1.md`](./markit-ariadne-contract-v1_1.md)
- Rollout: [`markit-ariadne-rollout.md`](./markit-ariadne-rollout.md)
- Adapter notes: [`markit-adapter-integration.md`](./markit-adapter-integration.md)
- Leak URL scan + DMCA: [`ariadne-leak-attribution.md`](./ariadne-leak-attribution.md)
- E2E smoke: `pnpm run test:ariadne-markit-e2e-smoke` (requires `ARIADNE_E2E_ACTOR_USER_ID` when using service mode)
- Local reference server: `node scripts/markit-v4-api-reference.mjs` (see script header) or `pnpm run markit:v4-api-reference`
