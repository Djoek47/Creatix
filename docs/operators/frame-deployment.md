# Frame + Creatix — operator runbook (v1)

## Overview

- **Frame editor** ships in this repository under [`frame-editor/`](../../frame-editor/README.md) on branch **`frame`**. Deploy it as a **separate Vercel project** (same GitHub repo, **Root Directory** `frame-editor`, branch `frame`) so it can live on its own origin (e.g. `frame.yourdomain.com`).
- Optional styling reference: **[frame-branding-tokens.css](frame-branding-tokens.css)** (CSS variables aligned with Creatix).
- Upstream reference (MIT): [aregrid/frame](https://github.com/aregrid/frame) — not vendored as a submodule; this app is a focused web editor integrated with Creatix vault APIs.
- **Creatix** exposes:
  - `GET /api/content/vault/[id]/frame-session` — authenticated; returns `assetProxyUrl`, `exportToken`, `exportUrl`, optional `frameLaunchUrl`.
  - `GET /api/content/vault/[id]/asset?t=...` — HMAC token; proxies video (Range supported for external URLs).
  - `POST /api/content/vault/[id]/frame-export` — multipart `file` + `exportToken` (HMAC) from the browser (Markit/Frame origin must match `NEXT_PUBLIC_FRAME_URL` CORS), or **session cookie** (creator upload), or **Frame service** header `X-Frame-Export-Secret` + token (legacy proxy).
  - `GET /api/content/vault/[id]/download` — redirects to signed URL or external `file_url`.

### Markit: second angle (`importUrl2`)

For **dual-camera** workflows, the Markit deployment accepts an optional query param **`importUrl2`**: a second **`assetProxyUrl`** from another vault item’s `frame-session` (same user). Markit fetches both videos in the browser; AI edit plans can reference `"source":"secondary"` for segments from the second file. **Vault upload** still uses the **primary** item’s `exportUrl` + `exportToken` only. See Markit `DEPLOYMENT.md` (dual angle section) in the Markit repo — if cloned next to Creatix: `../markit/DEPLOYMENT.md`.

## Environment variables (Creatix / Vercel)


| Variable                    | Required             | Description                                                                                                                                                     |
| --------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FRAME_BRIDGE_SECRET`       | **Yes** (for bridge) | Min 16 chars. Signs asset-read and export tokens (`lib/frame-vault-bridge.ts`).                                                                                 |
| `FRAME_EXPORT_SECRET`       | Optional (legacy)    | Shared secret for server-side proxies that POST with `X-Frame-Export-Secret`. Markit posts **directly** to this API with `exportToken` only (no secret in browser). |
| `NEXT_PUBLIC_FRAME_URL`     | **Recommended**      | e.g. `https://markit-xxx.vercel.app` — `frameLaunchUrl` + **CORS** for vault export. Comma-separated for multiple origins. Must **exactly** match the editor tab’s origin. |
| `ARIADNE_SECRET`            | Optional             | Signs Ariadne forensic payloads (`append-v1`). Falls back to `FRAME_BRIDGE_SECRET` if unset.                                                                    |
| `NEXT_PUBLIC_SUPABASE_URL`  | Yes                  | Storage uploads.                                                                                                                                                |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes                  | Server-side storage + DB updates.                                                                                                                               |


Rotate `FRAME_BRIDGE_SECRET` and `FRAME_EXPORT_SECRET` if leaked; old tokens become invalid.

### Local development

1. In the **Creatix project root** (same folder as `package.json`), create or edit `**.env.local`** (gitignored).
2. Set a value at least **16 characters** (e.g. run `openssl rand -hex 16` on macOS/Linux/Git Bash, or use any long random string).
3. Add:
  ```bash
   FRAME_BRIDGE_SECRET=paste_your_value_here
  ```
4. **Restart** the dev server so Next.js reloads env.

On **Vercel**: Project → Settings → Environment Variables → add `FRAME_BRIDGE_SECRET` for the right environments → **Redeploy**.

## Database / Storage (Supabase)

1. Run `scripts/074_vault_media_storage.sql` — adds `content.vault_storage_path`.
2. Run `scripts/075_vault_media_bucket.sql` — creates private bucket `vault-media` (500 MB object limit in script).

Without these, `frame-export` uploads fail with bucket/column errors.

## Frame app configuration (fork or env)

Until Frame is patched to read `importUrl` and POST exports automatically:

1. Creators can still **Replace video** in the vault sheet (multipart to `frame-export`).
2. Markit/Frame: load source from `importUrl` (`frameLaunchUrl`). POST `file` + `exportToken` to `exportUrl` **from the browser** (CORS). Avoid proxying large files through a second Vercel app (small body limits).

Example curl (legacy server proxy with secret):

```bash
curl -X POST "https://YOUR_CREATIX/api/content/vault/CONTENT_ID/frame-export" \
  -H "X-Frame-Export-Secret: $FRAME_EXPORT_SECRET" \
  -F "exportToken=TOKEN_FROM_FRAME_SESSION" \
  -F "file=@export.mp4"
```

## CORS

- Asset proxy is **same-origin** (Creatix) — avoids browser CORS to OnlyFans/CDN when Frame loads `importUrl`.
- **`NEXT_PUBLIC_FRAME_URL`:** When set, matching origins get CORS on `frame-export`, `asset`, Ariadne embed, etc., so Markit can call Creatix from the browser (multipart export and APIs that use `Authorization: Bearer <exportToken>`).

## Retention / storage

- `file_url` stores a **long-lived signed URL** (60 days in current implementation) after upload; `**vault_storage_path`** stores the durable path for re-signing.
- Product expectation: **short hosting** — encourage **Download**; optional follow-up: Supabase lifecycle rules on `vault-media`.

## Troubleshooting


| Symptom                                         | Check                                                                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **503** “FRAME_BRIDGE_SECRET is not configured” | Set `FRAME_BRIDGE_SECRET` (≥16 chars) in `.env.local` and restart dev; on Vercel add the var and redeploy. |
| 500 on export, “Bucket not found”               | Run `075_vault_media_bucket.sql`.                                                                          |
| 500 on export, column error                     | Run `074_vault_media_storage.sql`.                                                                         |
| `frame-session` 400 “No video file”             | Row must be `content_type` video and `file_url` **or** `vault_storage_path`.                               |
| Token invalid                                   | Clock skew / expired token; re-open sheet and retry.                                                       |