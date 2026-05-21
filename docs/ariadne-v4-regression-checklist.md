# Ariadne V4 — regression checklist (Creatix)

Run after changing `app/api/ariadne/*`, `lib/ariadne/*`, or `lib/markit/creatix-ariadne-client.ts`.

## 1. Session / app flows (credits on)

- [ ] **1:1 message send** with trace (if applicable): `app/api/onlyfans/messages/[fanId]/route.ts` still passes lineage/recipient to embed path.
- [ ] **Mass message** and **mass campaign** (`app/api/messages/mass/`, `campaign-execute`) still create traces; credits align with `mass-campaign-credits` expectations.
- [ ] **Frame editor** (vault bridge):
  - [ ] Traced export still succeeds with `Authorization: Bearer` export token + `x-idempotency-key`.
  - [ ] **Trace verification** (detect) on Frame: file upload + token + `contentId` match returns JSON (CORS to Frame origin).

## 2. M2M (Markit / smoke)

- [ ] `MARKIT_ARIADNE_SERVICE_MODE=true`, valid `x-creatix-actor-user-id` on all signed calls.
- [ ] **Embed** returns `billingMode: "service"` and `creditsCharged: 0` (no user debit).
- [ ] **Detect** returns `billingMode: "service"` for service calls.
- [ ] Exports list/detail/evidence (GET) with signed headers + same actor.
- [ ] E2E: `pnpm run test:ariadne-markit-e2e-smoke` with `ARIADNE_E2E_ACTOR_USER_ID` + content + file.

## 3. Idempotency

- [ ] Same `x-idempotency-key` + same user: second request replays first response (embed/detect) without double embed/double credit (user path).
- [ ] Service path: same idempotency key for **different** `x-creatix-actor-user-id` does not cross-replay (scoped keys).

## 4. Unit tests

- [ ] `pnpm run test:ariadne-service-auth`
