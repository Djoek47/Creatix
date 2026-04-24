# Ariadne leak URL attribution (Protection → DMCA)

Creatix can run **Markit / Ariadne** forensic analysis on the **same HTTP(S) URL** already stored on a `leak_alerts` row—without open-ended server-side request forgery. The user clicks **Trace to recipient** on an active alert; the server downloads only that row’s `source_url` (SSRF-guarded, size-capped) and runs a **progressive** scan.

## API

- **`POST /api/leaks/alerts/[id]/attribution`** — Session auth. Resolves the alert for the signed-in user, fetches the URL, runs [`progressiveMarkitAttributionFromBuffer`](../lib/ariadne/progressive-leak-scan.ts), enriches with `ariadne_exports` when a payload id matches, debits **`ariadne-detect`** credits. Response matches [`MarkitAttributionResult`](../lib/ariadne/attribution-types.ts) plus `creditsCharged`, `leak_alert_id`, `fetched_url`.

### Credits and wallet idempotency

The debit uses the credit wallet’s idempotency key. Behavior:

| Client behavior | Idempotency key (conceptually) | Effect |
|-----------------|----------------------------------|--------|
| `Idempotency-Key` or `X-Idempotency-Key` header | One key per (user, alert, opaque value) | **New key per trace = new charge.** Re-sending the **same** key (e.g. client retry after a network error) = **at most one** debit. |
| JSON body `reScan: true` or `forceNewCharge: true` | A fresh server `randomUUID` each request | **Paid re-run** without supplying a client key (e.g. `curl` / scripts). |
| Neither header nor rescan flags | `leak_attribution:{userId}:{alertId}` | **At most one** debit per alert (legacy); repeat traces do not debit again unless you use a header or `reScan` / `forceNewCharge`. |

The Protection dashboard sends a new `Idempotency-Key: crypto.randomUUID()` on every **Trace to recipient** click so each run is a separate charge. Optional JSON body: `{ "reScan": true }` with `Content-Type: application/json`.

## Progressive scan behavior

1. **Append-v1 (metadata)** — Reads the end of the file (optionally after a **Range** tail fetch for the last ~8 MB) and runs append-v1 extraction. Fast, no full decode.
2. **FFmpeg stills (128-bit microdots)** — If `FFMPEG_PATH` (or `ffmpeg` on `PATH`) is available and `ARIADNE_FFMPEG_LEAK_SCAN=1`, decodes a bounded set of frame timestamps in temp files, runs [`detectWatermark`](../lib/ariadne/watermark-engine/detect.ts) on grayscale frames, stops on a hit.
3. **Fallback** — If ffmpeg is off or fails, uses the existing buffer heuristic in [`analyzeMarkitAttribution`](../lib/ariadne/attribution-analyze.ts) and surfaces **warnings** for re-encoded video.

## Vercel and ops

- **Serverless** — Bundling a full `ffmpeg` binary in Vercel Lambdas is operationally heavy; the frame path is **opt-in** via `ARIADNE_FFMPEG_LEAK_SCAN` and a reachable `FFMPEG_PATH`. Without it, Creatix still runs append-v1 and heuristics.
- **Self-hosted** or a **Markit** worker (see [markit-adapter-integration.md](./markit-adapter-integration.md)) can decode frames and rely on the same Creatix **detect** semantics if you post buffers to an internal route—this doc covers the first-party **leak URL** flow only.

## DMCA

When a trace has been run for an alert, **Download DMCA** sends optional `ariadneAttributionEvidence` to `POST /api/dmca/claim` so a short, human-readable line is **appended** to the work description in the generated notice. Creators should still **verify** attribution before legal use.

## Markit (out of repo)

Production exports that must match `watermark_v2_uuid` in Creatix are produced in the **[Markit](https://github.com/Djoek47/markit)** app; that repo owns render/ffmpeg. Creatix owns decode + detect for uploaded or leak-fetched media and the Protection/DMCA UI wiring.
