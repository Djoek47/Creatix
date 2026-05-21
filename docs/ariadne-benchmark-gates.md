# Ariadne Benchmark Gates

## Required transformation suite

- transcode: low, medium, high
- crop: 5%, 10%, 20%
- trim: start, mid, end
- scale: down and up
- blur, noise, denoise

## Metrics

- detection_rate
- false_positive_rate
- confidence_distribution

## Pre-GA thresholds

- detection_rate on registered payload corpus: >= 0.92
- false_positive_rate on clean corpus: <= 0.01
- median confidence on true positives: >= 0.88
- p90 confidence on false positives: <= 0.30

## Kill-switch policy

If any threshold regresses in production telemetry:

- disable `ARIADNE_V2_DETECT_ENABLED`
- optionally disable `ARIADNE_V2_EMBED_ENABLED`
- continue serving append-v1 flows while remediation occurs

