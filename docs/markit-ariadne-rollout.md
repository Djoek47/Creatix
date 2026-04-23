# Markit + Ariadne Rollout Controls

This rollout keeps Creatix authoritative while letting Markit service calls ramp safely.

## Feature flags

- `MARKIT_ARIADNE_SERVICE_MODE`
  - `false` (default): reject service-origin Markit requests.
  - `true`: allow signed Markit requests for `/api/ariadne/embed` and `/api/ariadne/detect`.
- `ARIADNE_SERVICE_AUTH_ENFORCED`
  - When enabled, service requests must include `v1.1` signature headers (nonce + idempotency).
- `ARIADNE_DETECT_CONFIDENCE_GATING` (legacy alias)
  - `false`: log all detect outcomes.
  - `true`: treat only `registered` matches as passing confidence gate for automated actions.
- `ARIADNE_V2_EMBED_ENABLED`
  - controls async v2 embed queue endpoint.
- `ARIADNE_V2_DETECT_ENABLED`
  - controls robust v2 detect endpoint.
- `ARIADNE_CONFIDENCE_GATING_ENABLED`
  - primary confidence gating flag for escalation policy.
- `FRAMER_TRACED_EXPORT_ENABLED`
  - enables editor one-click and batch traced export actions.

## Staged ramp

1. **Internal only**
   - `MARKIT_ARIADNE_SERVICE_MODE=true`
   - Markit traffic from one internal workspace.
   - Monitor: auth failures, nonce replay rejects, duplicate idempotency rates.
2. **Beta creators**
   - Keep signed service auth required.
   - Enable selected creator allowlist in Markit side.
   - Monitor: trace success rate, detect classification distribution, credit debit single-charge checks.
3. **Production ramp**
   - Increase rollout percent in Markit.
   - Keep audit drill cadence: weekly evidence retrieval validation.

## Rollback path

If Markit error rate spikes:

1. Set `MARKIT_ARIADNE_SERVICE_MODE=false`.
2. Keep existing in-app Ariadne dashboard flow active (`vault_standalone` source path remains available).
3. Retain created exports/evidence in canonical `ariadne_exports`; no data rewrite required.
4. Optionally disable v2 independently:
   - `ARIADNE_V2_EMBED_ENABLED=false`
   - `ARIADNE_V2_DETECT_ENABLED=false`

## Success criteria

- No replayed nonce accepted.
- No duplicate forensic row for same idempotency key.
- Credits debited exactly once per trace/detect execution intent.
- Evidence endpoint returns hash chain and detect timeline for legal review.
