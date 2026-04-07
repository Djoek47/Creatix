# Creatix

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

**GitHub:** [github.com/Djoek47/CirceEtVenus](https://github.com/Djoek47/CirceEtVenus) (product: Circe et Venus / Creatix).

**Mobile (Expo) + web:** from this repo, [`scripts/push-all.sh`](scripts/push-all.sh) pushes **this** repo and a sibling **`../creatix-mobile`** clone (override with `MOBILE_DIR`). See [`docs/MOBILE_APP_REPO.md`](docs/MOBILE_APP_REPO.md).

To push this codebase to that repo (empty or new default branch), use:

```bash
git push -u circe-et-venus main
```

(`origin` may still point at [Creatix](https://github.com/Djoek47/Creatix); the remote named `circe-et-venus` targets CirceEtVenus.)

**Architecture & mobile:** See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (web vs API vs Supabase), [docs/mobile-app.md](docs/mobile-app.md) (PWA, Capacitor), and [docs/MOBILE_APP_REPO.md](docs/MOBILE_APP_REPO.md) (Expo app in a **separate repository**). Parallel work: [docs/AGENTS.md](docs/AGENTS.md).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_9Aq9U0GB9Cky0Eu8x3NFOSG8xATR)

## Getting Started

This repo uses **pnpm** (see `package.json` → `packageManager`). On a new machine, align **Node** with [`.nvmrc`](.nvmrc) (e.g. `nvm use`, `fnm use`, or install Node 22 LTS).

```bash
corepack enable && corepack prepare pnpm@9.15.4 --activate
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

**Switching computers or OS (Windows ↔ macOS ↔ Linux):** follow [`docs/internal/PC_SWITCH_HANDOFF.md`](docs/internal/PC_SWITCH_HANDOFF.md) — branch to use, env vars, Supabase notes. Text files are normalized to **LF** via [`.gitattributes`](.gitattributes) so line endings stay consistent across platforms.

**Shell scripts** (e.g. [`scripts/push-all.sh`](scripts/push-all.sh)): on Windows, run from **Git Bash**, **WSL**, or another environment that provides `bash`; on macOS/Linux, `chmod +x scripts/push-all.sh` if needed.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.

<a href="https://v0.app/chat/api/kiro/clone/Djoek47/Creatix" alt="Open in Kiro"><img src="https://pdgvvgmkdvyeydso.public.blob.vercel-storage.com/open%20in%20kiro.svg?sanitize=true" /></a>
