# Ariadne Detection Confidence Policy

This policy governs how detection output maps to legal/ops actions.

## Match states

- `no_marker`
- `marker_invalid_signature`
- `marker_expired`
- `marker_valid_unregistered`
- `marker_valid_registered`

## Confidence ranges

- `0.00 - 0.24`: weak signal / non-actionable
- `0.25 - 0.59`: partial/uncertain, requires manual review
- `0.60 - 0.84`: moderate confidence, escalate internally
- `0.85 - 1.00`: high confidence, eligible for legal action

## Action matrix

- `no_marker`
  - default confidence: `0.02`
  - action: no legal action
- `marker_invalid_signature`
  - default confidence: `0.10`
  - action: no legal action, flag potential tampering
- `marker_expired`
  - default confidence: `0.35`
  - action: manual review only
- `marker_valid_unregistered`
  - default confidence: `0.55`
  - action: manual forensic review; no automatic DMCA
- `marker_valid_registered`
  - default confidence: `0.99`
  - action: legal escalation permitted if ownership checks pass

## DMCA eligibility threshold

Minimum requirements for DMCA automation:

- match state: `marker_valid_registered`
- confidence: `>= 0.85`
- ownership check: pass
- evidence chain: complete (hashes + signed timestamps + detection history)

## Operational safeguards

- Confidence gating feature flag must be enabled for automated escalation.
- All non-high-confidence results require human review.
- Policy changes require version bump and sign-off from product + legal.
