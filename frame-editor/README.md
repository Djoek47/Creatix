# Creatix Frame editor (standalone)

Minimal **Circe et Venus** video bridge: opens a vault asset from `importUrl`, previews it, and uploads back to Creatix via `POST /api/export` (server proxies to Creatix `frame-export` with the export secret).

This package is meant to be **its own GitHub repository** and **its own Vercel project** (e.g. `https://frame-video-editor.vercel.app`), not the Creatix `frame` branch by itself.

## Own repo + branch

This folder is **not** part of the root `pnpm` workspace (it has its own `package-lock.json`) so it can be deployed independently.

**Option A — separate GitHub repo (recommended)**

1. Create a new empty repo (e.g. `Djoek47/creatix-frame-editor`).
2. Copy only the `frame-editor/` tree into it, or use subtree from Creatix:

   ```bash
   cd /path/to/Creatix
   git subtree split -P frame-editor -b frame-editor-only
   git push https://github.com/Djoek47/creatix-frame-editor.git frame-editor-only:main
   ```

3. Add a long-lived branch (e.g. `frame`): `git checkout -b frame && git push -u origin frame`.
4. **Vercel** → import that repo → Root Directory **`.`** → Production Branch **`frame`** or **`main`**.

**Option B — same `Creatix` repo, separate Vercel project**

1. Import `Djoek47/Creatix` into a **second** Vercel project.
2. Set **Root Directory** to **`frame-editor`** (not the monorepo root).
3. Use branch **`frame`** (or whichever branch carries this folder).

**Environment (Frame project on Vercel)**

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — **same project** as Circe et Venus (sign-in + subscription checks).
- `NEXT_PUBLIC_CREATIX_APP_URL` — e.g. `https://www.circeetvenus.com` (AI proxy + deep links).
- `FRAME_EXPORT_SECRET` — **identical** to Creatix `FRAME_EXPORT_SECRET`.

**Supabase dashboard:** add your Frame origin (e.g. `https://frame-video-editor.vercel.app`) to **Redirect URLs** so auth callbacks work.

**Creatix**

- `NEXT_PUBLIC_FRAME_URL` — your Frame URL, no trailing slash (e.g. `https://frame-video-editor.vercel.app`).

## Local dev

```bash
cd frame-editor
npm install
cp .env.example .env.local
# set FRAME_EXPORT_SECRET to match Creatix
npm run dev
```

Open `http://localhost:3010` — you still need a real launch URL from the vault (`importUrl`, `exportUrl`, `exportToken` query params).

## Security

- Never commit `.env.local`.
- `FRAME_EXPORT_SECRET` stays **server-only** on this app; the browser calls `/api/export`, which attaches `X-Frame-Export-Secret` to Creatix.
