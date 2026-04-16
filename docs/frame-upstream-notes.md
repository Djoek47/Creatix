# aregrid/frame — upstream audit (read-only)

**Repo:** [github.com/aregrid/frame](https://github.com/aregrid/frame)  
**License:** MIT (see [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md))

## Layout (main branch)

- Monorepo: `packages/frame-android`, `frame-backend`, `frame-common`, `frame-env`, `frame-ios`, `frame-web`, plus `docker/`, `cookbook/`, `scripts/`, `test/`.
- Root `package.json` is minimal; real app code lives under `packages/*`.
- `packages/frame-web` may contain only a stub `README.md` in shallow listings — **clone the repo locally** before wiring a production build; verify `package.json` and build scripts exist after checkout.

## Creatix integration (v1)

Creatix does **not** vendor Frame in this repository. **Fork** upstream into your org (branch `frame`), apply branding from [`docs/operators/frame-branding-tokens.css`](operators/frame-branding-tokens.css), then deploy Frame as a **separate Vercel project** (or Docker) and point:

- `NEXT_PUBLIC_FRAME_URL` — Frame web origin (e.g. `https://frame.example.com`).
- Configure Frame (fork or env) to:
  - Load source video from `assetUrl` returned by Creatix `GET /api/content/vault/[id]/frame-session`.
  - POST exports to `POST /api/content/vault/[id]/frame-export` with `X-Frame-Export-Secret` + `exportToken` + multipart `file`.

**Generative UI:** Hide or disable text-to-video / generation entry points in your Frame fork for v1; Creatix cannot enforce this without forking.

## Export callback

Until Frame is configured to call Creatix, users can **download** from Frame and use **Replace video** in the vault sheet (same storage path as automated export).
