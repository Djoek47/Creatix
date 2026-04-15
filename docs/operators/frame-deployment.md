# Frame + Creatix — operator runbook (v1)

## Overview

- **Frame** ([aregrid/frame](https://github.com/aregrid/frame)) runs as a **separate deployment** (e.g. Vercel project `frame.yourdomain.com`).
- **Creatix** exposes:
  - `GET /api/content/vault/[id]/frame-session` — authenticated; returns `assetProxyUrl`, `exportToken`, `exportUrl`, optional `frameLaunchUrl`.
  - `GET /api/content/vault/[id]/asset?t=...` — HMAC token; proxies video (Range supported for external URLs).
  - `POST /api/content/vault/[id]/frame-export` — multipart `file`; either **session cookie** (creator upload) or **Frame service** headers.
  - `GET /api/content/vault/[id]/download` — redirects to signed URL or external `file_url`.

## Environment variables (Creatix / Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `FRAME_BRIDGE_SECRET` | **Yes** (for bridge) | Min 16 chars. Signs asset-read and export tokens (`lib/frame-vault-bridge.ts`). |
| `FRAME_EXPORT_SECRET` | For Frame POST | Shared secret; Frame sends `X-Frame-Export-Secret: <value>` with export `exportToken` form field. |
| `NEXT_PUBLIC_FRAME_URL` | Optional | e.g. `https://frame.example.com` — used to build `frameLaunchUrl` (`?importUrl=`). If unset, UI still opens `assetProxyUrl` and manual **Replace video** works. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Storage uploads. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side storage + DB updates. |

Rotate `FRAME_BRIDGE_SECRET` and `FRAME_EXPORT_SECRET` if leaked; old tokens become invalid.

## Database / Storage (Supabase)

1. Run `scripts/074_vault_media_storage.sql` — adds `content.vault_storage_path`.
2. Run `scripts/075_vault_media_bucket.sql` — creates private bucket `vault-media` (500 MB object limit in script).

Without these, `frame-export` uploads fail with bucket/column errors.

## Frame app configuration (fork or env)

Until Frame is patched to read `importUrl` and POST exports automatically:

1. Creators can still **Replace video** in the vault sheet (multipart to `frame-export`).
2. Configure a future Frame build to:
   - Load source from `importUrl` query param (returned as `frameLaunchUrl`).
   - POST `file` + `exportToken` to `exportUrl` with header `X-Frame-Export-Secret`.

Example curl (service export):

```bash
curl -X POST "https://YOUR_CREATIX/api/content/vault/CONTENT_ID/frame-export" \
  -H "X-Frame-Export-Secret: $FRAME_EXPORT_SECRET" \
  -F "exportToken=TOKEN_FROM_FRAME_SESSION" \
  -F "file=@export.mp4"
```

## CORS

- Asset proxy is **same-origin** (Creatix) — avoids browser CORS to OnlyFans/CDN when Frame loads `importUrl`.
- If Frame is on another origin, allow that origin in Frame’s server config to call Creatix export (or use server-side POST from Frame backend only).

## Retention / storage

- `file_url` stores a **long-lived signed URL** (60 days in current implementation) after upload; **`vault_storage_path`** stores the durable path for re-signing.
- Product expectation: **short hosting** — encourage **Download**; optional follow-up: Supabase lifecycle rules on `vault-media`.

## Troubleshooting

| Symptom | Check |
|--------|--------|
| 500 on export, “Bucket not found” | Run `075_vault_media_bucket.sql`. |
| 500 on export, column error | Run `074_vault_media_storage.sql`. |
| `frame-session` 400 “No video file” | Row must be `content_type` video and `file_url` **or** `vault_storage_path`. |
| Token invalid | Clock skew / expired token; re-open sheet and retry. |

See also [`docs/frame-upstream-notes.md`](../frame-upstream-notes.md).
