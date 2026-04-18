# Markit + Creatix — master delivery plan

This is the **execution plan** companion to `[markit-ecosystem-architecture.md](markit-ecosystem-architecture.md)` (boxes and flows). Use it for sequencing work, demos, and release notes.

**North star:** Prompt/voice → validated edit plan → executor (browser now, worker when needed) → vault → optional Ariadne, with **Creatix** as the only authority for auth, storage, credits, and vault rows.

---

## How to read this doc


| Column         | Meaning                                       |
| -------------- | --------------------------------------------- |
| **Outcome**    | What “done” looks like for a user or operator |
| **Depends on** | Env, deploy order, or prior phase             |
| **Repo**       | Where most code lives (`Creatix` vs `markit`) |


Markit repo also keeps a short technical backlog: `[markit/ROADMAP.md](../../markit/ROADMAP.md)` when repos are siblings, or on GitHub [markit/ROADMAP.md](https://github.com/Djoek47/markit/blob/main/ROADMAP.md).

---

## Phase 0 — Baseline (maintain)

**Outcome:** Vault launch → preview → trim → direct POST to `frame-export` → optional Ariadne; no 413 on large uploads; CORS correct.


| #   | Work                                                                                   | Repo    | Notes                               |
| --- | -------------------------------------------------------------------------------------- | ------- | ----------------------------------- |
| 0.1 | `NEXT_PUBLIC_FRAME_URL` on Creatix matches Markit origin(s)                            | Creatix | Comma-separated exact origins       |
| 0.2 | Export uses **direct** `POST` to Creatix `frame-export` with `exportToken`             | markit  | Avoid proxying big bodies on Vercel |
| 0.3 | Frame Assist system prompt includes `markit-edit` JSON when user asks for deliverables | Creatix | Already in `/api/frame/ai/assist`   |
| 0.4 | Smoke test: AI Studio → Markit → save → refresh vault                                  | manual  |                                     |


**Exit criteria:** Operator checklist in `[DEPLOYMENT.md](../../markit/DEPLOYMENT.md)` (Markit) + frame runbook passes.

---

## Phase 1 — AI plans → real MP4 (browser)

**Outcome:** Assistant replies include a valid fenced `**markit-edit`** JSON block; user clicks **Build & upload**; file lands in vault.


| #   | Work                                                                          | Repo             | Depends on |
| --- | ----------------------------------------------------------------------------- | ---------------- | ---------- |
| 1.1 | Parser + executor (trim + concat) stable for typical lengths                  | markit           | Phase 0    |
| 1.2 | UI: “AI edit ready” + disabled state when plan needs `importUrl2` but missing | markit           |            |
| 1.3 | Docs: how to add second angle (`importUrl2`) for power users                  | Creatix + markit |            |
| 1.4 | Telemetry or logging optional: export failures (status only, no PII)          | either           |            |


**Exit criteria:** Record a short Loom: ask for “30s teaser” → build → file in vault.

---

## Phase 2 — Timeline UX (multi-clip, not just chat)

**Outcome:** Users see **clips on a timeline** (order, in/out), edit numerically or by drag later; export still one MP4 to same vault contract.


| #   | Work                                                                                | Repo   | Notes                     |
| --- | ----------------------------------------------------------------------------------- | ------ | ------------------------- |
| 2.1 | **Project model** in memory (and optional `localStorage`): ordered segments, labels | markit | JSON serializable         |
| 2.2 | Timeline strip UI: playhead, segment blocks, reorder                                | markit | Pattern from voidcut/proj |
| 2.3 | Sync timeline ↔ preview seek                                                        | markit |                           |
| 2.4 | “Export timeline” → same concat pipeline as `markit-edit`                           | markit | Single code path          |


**Exit criteria:** Build a 3-segment compilation without typing JSON by hand (UI produces plan).

---

## Phase 3 — Voice + stronger prompts

**Outcome:** Mic → STT → same Assist pipeline; presets for “teaser / compilation / rough cut”.


| #   | Work                                                                       | Repo    | Notes                  |
| --- | -------------------------------------------------------------------------- | ------- | ---------------------- |
| 3.1 | Browser STT (Web Speech API or provider) → text field                      | markit  | Privacy copy in UI     |
| 3.2 | Optional: pass **duration** or **chapter hints** from Creatix if available | Creatix | Needs content metadata |
| 3.3 | Tune Frame Assist prompts for fewer invalid timestamps                     | Creatix |                        |


**Exit criteria:** Voice command produces a buildable plan or clear refusal.

---

## Phase 4 — Heavy exports (optional worker)

**Outcome:** Long or complex jobs don’t freeze the tab; job completes → same vault row updated (or signed URL finalize).


| #   | Work                                                                          | Repo             | Notes                                 |
| --- | ----------------------------------------------------------------------------- | ---------------- | ------------------------------------- |
| 4.1 | **Job API** on Creatix: accept project JSON + token, enqueue render           | Creatix          | Vercel Workflow / Inngest / queue TBD |
| 4.2 | Worker: FFmpeg or Remotion render → upload to `vault-media` → patch `content` | Creatix / worker | Match `frame-export` semantics        |
| 4.3 | Markit: “Send to cloud render” when over wasm limits                          | markit           |                                       |


**Depends on:** Budget, infra, Pro limits.

**Exit criteria:** 10+ minute compile succeeds without browser OOM.

---

## Phase 5 — Ariadne product depth

**Outcome:** Clear UX: after export, embed marker; honest limits on re-encode survival (per existing spec).


| #   | Work                                                                                                      | Repo    | Notes |
| --- | --------------------------------------------------------------------------------------------------------- | ------- | ----- |
| 5.1 | Keep append-v1 flow reliable; copy links to `[docs/ariadne-technical-spec.md](ariadne-technical-spec.md)` | Creatix |       |
| 5.2 | Optional: “embed on render” if Phase 4 ships                                                              | Creatix |       |


**Exit criteria:** Support script for creator-facing FAQ.

---

## Phase 6 — Ecosystem glue (Divine / AI Studio)

**Outcome:** Deep links and consistent copy: “Edit in Markit” from vault; future: shortcut from Divine contexts if product wants it.


| #   | Work                                                  | Repo    | Notes |
| --- | ----------------------------------------------------- | ------- | ----- |
| 6.1 | Vault + AI Studio entry points audited                | Creatix |       |
| 6.2 | Optional: `returnUrl` or campaign query for analytics | Creatix |       |


**Exit criteria:** New team member can trace URL from dashboard to Markit in one diagram.

---

## Cross-cutting (ongoing)


| Area            | Actions                                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Security**    | Rotate `FRAME_BRIDGE_SECRET` / export tokens if leaked; never expose `FRAME_EXPORT_SECRET` to browser for auth (token-only path documented). |
| **Licenses**    | Any code borrowed from Kimu/Remotion/third parties: comply before merge.                                                                     |
| **Performance** | ffmpeg.wasm load once; cap segment count in UI; warn on huge files.                                                                          |


---

## What we are **not** committing in this plan

- Full Video Cut / CapCut parity on day one  
- Invisible markers that survive all re-encodes without R&D  
- Merging Divine chat UI into Markit (unless explicitly added in Phase 6)

---

## Review cadence

- **Monthly:** Reconcile this plan with `markit/ROADMAP.md` and shipping reality.  
- **After each phase:** Update exit criteria checkboxes in git or project board.

---

## Quick links

- Architecture (diagrams): `[markit-ecosystem-architecture.md](markit-ecosystem-architecture.md)`  
- Frame operator notes: `[operators/frame-deployment.md](operators/frame-deployment.md)`  
- Creatix architecture index: `[ARCHITECTURE.md](ARCHITECTURE.md)`