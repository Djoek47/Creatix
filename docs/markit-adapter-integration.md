# Markit adapter integration notes

Markit should call Creatix through `lib/markit/creatix-ariadne-client.ts`.

## Minimal usage

```ts
import { MarkitCreatixAriadneClient } from '@/lib/markit/creatix-ariadne-client'

const client = new MarkitCreatixAriadneClient({
  baseUrl: process.env.CREATIX_BASE_URL!,
  serviceName: 'markit',
})

const trace = await client.embed({
  contentId,
  recipientKey,
  source: 'frame_export',
  lineage: {
    jobId: renderJob.id,
    pipelineVersion: RENDER_PIPELINE_VERSION,
    encoderProfile: renderProfile,
  },
})
```

## Required environment in Markit

- `MARKIT_ARIADNE_SHARED_SECRET` (must match Creatix)
- `CREATIX_BASE_URL`

## Operational constraints

- Always send one idempotency key per execution intent.
- Retries must reuse the same idempotency key.
- Do not persist recipient identity authority in Markit DB; keep only operational mirrors (job id, export id, payload id).
