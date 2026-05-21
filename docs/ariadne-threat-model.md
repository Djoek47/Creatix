# Ariadne Threat Model

This threat model defines attack categories, expected detector behavior, and mitigation priorities.

## Assets to protect

- Attribution integrity (payload to canonical export mapping).
- Evidence chain integrity (hashes, timestamps, detection history).
- Recipient identity privacy.

## Adversarial transformations

## Screenshot / screen-record

- Risk: watermark removed because re-captured pixels are transformed.
- Mitigation:
  - temporal redundancy in v2
  - region diversity in embedding
  - confidence downgrades when only weak partial recovery exists

## Transcode

- Risk: lossy compression attenuates embedded coefficients.
- Mitigation:
  - mid-band DCT embedding tuned for codec resilience
  - ECC reconstruction
  - multi-frame voting

## Crop

- Risk: embedded regions cut out.
- Mitigation:
  - multi-region embedding with geometric spread
  - detection across multiple candidate windows

## Speed change / frame interpolation

- Risk: temporal index shift breaks sequence assumptions.
- Mitigation:
  - periodic temporal embedding
  - non-sequential frame sampling in detector

## Overlay / blur / denoise

- Risk: perturbation and smoothing degrade signal.
- Mitigation:
  - robust coefficient selection
  - mixed-layer approach (frequency + spatial micro-layer)
  - confidence gating policy for enforcement actions

## Abuse scenarios

- Forged marker payload injection.
  - Mitigation: HMAC signature verification and expiry checks.
- Replay of signed service calls.
  - Mitigation: signed timestamp + nonce uniqueness + replay window.
- Unauthorized evidence access.
  - Mitigation: ownership checks and signed short-lived URLs.

## Residual risk statement

No watermark is undefeatable. Ariadne is designed for probabilistic forensic attribution under practical transformations, with policy-gated legal action.
