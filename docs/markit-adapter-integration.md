# Markit adapter integration notes

The **Markit** application (separate codebase) calls Creatix for Ariadne embed/detect/exports. Reference implementation: [github.com/Djoek47/markit](https://github.com/Djoek47/markit).

In this repository, Markit should call Creatix through `lib/markit/creatix-ariadne-client.ts` (copy or package that client into the Markit app as needed).

## Minimal usage

```ts
import { MarkitCreatixAriadneClient } from '@/lib/markit/creatix-ariadne-client'

const client = new MarkitCreatixAriadneClient({
  baseUrl: process.env.CREATIX_BASE_URL!,
  serviceName: 'markit',
  /** Required for M2M: Supabase `profiles.id` of the creator (scopes embed/detect/exports). */
  actorUserId: process.env.CREATIX_ACTOR_USER_ID!,
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
- `CREATIX_ACTOR_USER_ID` (creator user UUID; sent as `x-creatix-actor-user-id`)

See also: [`markit-ariadne-v4.md`](./markit-ariadne-v4.md).

## 128-bit frame watermarking (production exports)

For **re-encoded** leak copies, Creatix leak scanning uses decoded luminance frames and [`detectWatermark`](../lib/ariadne/watermark-engine/detect.ts) with **128-bit** payload bits. Markit (or any render pipeline that must round-trip to Creatix `ariadne_exports` / `watermark_v2_uuid`) should embed the same **per-frame** bits using the embed side (`uuidHexToBits` + `embedWatermark` in this repo) so payload ids align with `create-ariadne-trace-export` metadata. The Creatix **upload** path only receives finished files; Markit is responsible for **embedding** in rendered exports. See also [`ariadne-leak-attribution.md`](./ariadne-leak-attribution.md).

## Operational constraints

- Always send one idempotency key per execution intent.
- Retries must reuse the same idempotency key.
- Do not persist recipient identity authority in Markit DB; keep only operational mirrors (job id, export id, payload id).
