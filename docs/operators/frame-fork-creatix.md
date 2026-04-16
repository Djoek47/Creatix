# Creatix Frame fork — Git and branch

Upstream: [github.com/aregrid/frame](https://github.com/aregrid/frame) (MIT).

## Create the fork

1. On GitHub: **Fork** `aregrid/frame` into your org (e.g. `Djoek47/creatix-frame`).
2. Clone locally:
   ```bash
   git clone https://github.com/YOUR_ORG/creatix-frame.git
   cd creatix-frame
   ```
3. Add upstream (optional, for merges):
   ```bash
   git remote add upstream https://github.com/aregrid/frame.git
   ```
4. Create the customization branch:
   ```bash
   git checkout -b frame
   git push -u origin frame
   ```
5. **Production branch on Vercel:** point the Frame Vercel project at `frame` (or merge `frame` → `main` and deploy `main`).

## Placeholder for your fork URL

Replace below after you create the fork:

- **Fork URL:** `https://github.com/YOUR_ORG/creatix-frame`
- **Default branch for Creatix branding:** `frame`

## Related docs

- Brand tokens to copy into `packages/frame-web`: [`docs/operators/frame-branding-tokens.css`](frame-branding-tokens.css) (CSS variables).
- Creatix bridge env: [`frame-deployment.md`](frame-deployment.md).
