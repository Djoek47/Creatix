# HTTP API surface (incremental)

**Purpose:** Give humans and **non-browser clients** (PWA, Capacitor WebView, future Expo) a map of **Route Handlers** under `app/api/`. This file is **not** exhaustive on day one—extend it when you add or materially change routes.

**Rules for mobile / native clients**

- Do **not** depend on **RSC HTML** or layout as a stable contract. Use **`/api/*`** and Supabase client libraries with the same auth model as the web app.
- **Web / PWA:** session is usually **cookie**-based (`createClient()` from `lib/supabase/server.ts`).
- **Native (Expo):** send **`Authorization: Bearer <access_token>`** (Supabase session JWT). Route Handlers that call **`createRouteHandlerClient(request)`** from [`lib/supabase/route-handler.ts`](../lib/supabase/route-handler.ts) accept Bearer **or** cookies. Migrate new routes to that helper when native needs them; until then, cookie-only routes won’t work from the Expo app. The in-repo client lives at [`apps/mobile/lib/api.ts`](../apps/mobile/lib/api.ts); a standalone Expo clone uses the same pattern.

## Groups (starter index)

| Prefix | Purpose |
|--------|---------|
| `app/api/ai/*` | AI tools: captions, churn, divine manager chat/realtime, media edit, message suggestions, mass DM helpers, etc. |
| `app/api/community/*` | Community tips (creator submissions). |
| `app/api/content/*` | Content vault, import, publish. |
| `app/api/cron/*` | Scheduled jobs (Smart classify list/tag sync, divine manager). |
| `app/api/fans/classify/*` | Smart classify: activity snapshot, OnlyFans list picker. |
| `app/api/divine/*` | Divine Manager: mimic, intents, DM thread, voice, fan profile, notifications briefing, etc. |
| `app/api/dmca/*` | DMCA claims and proof uploads. |
| `app/api/fansly/*` | Fansly: auth, sync, conversations, webhooks, notifications stub. |
| `app/api/leaks/*` | Leak scan and alerts. |
| `app/api/messages/*` | Mass messages and **mass segment** AI (`messages/mass/segments`). |
| `app/api/onlyfans/*` | OnlyFans: auth, sync, chats, messages, fans, media, analytics, webhooks, mass send, etc. |
| `app/api/platforms/*` | Platform niches and related updates. |
| `app/api/profile/*` | Profile / community links. |
| `app/api/proxy/*` | Image proxy for CDN media. |
| `app/api/revenue/*` | Revenue aggregation. |
| `app/api/social/*` | Social connect, reputation, mentions, scans. |
| `app/api/stripe/*` | Stripe webhooks and billing-related server paths. |
| `app/api/user/*` | User API keys, notification preferences, identity scan. |
| `app/api/ariadne/*` | Ariadne forensic trace APIs: embed, detect, export listing, and evidence retrieval bundles. |
| `app/api/contact` | Contact form (if enabled). |
| `app/api/chat` | Generic chat route (if used). |

**`apps/mobile` (Expo)** uses Bearer `apiFetch` for routes above where implemented, plus direct Supabase reads for dashboard lists (`content`, `fans`, `leak_alerts`, `reputation_mentions`, `analytics_snapshots`, etc.). Deep links: `creatix://` — see [`apps/mobile/lib/linking.ts`](../apps/mobile/lib/linking.ts).

## Aliases / deprecation

- **`app/api/ai/mass-dm-segments`** re-exports the canonical **`POST app/api/messages/mass/segments`** — keep one implementation; see route file comments.

## Maintenance

When you add a **new public API** or change **auth requirements**, add one line under the right group (or add a group) and reference the PR.

## Recent additions

- `GET app/api/onlyfans/check-connection` — session auth; verifies SDK connection. When connected, JSON may include `adultPlatformBillingDenial`, `onlyFansAccessBlocked`, `fanslyAccessBlocked`, and legacy `onlyFansBillingBlock` if the paid plan is not in good standing or the subscribed revenue band is below the **higher** of scoped OnlyFans and Fansly monthly signals (each tied to the connected partner account id; see `scripts/056_platform_observed_monthly_revenue.sql`, `scripts/057_platform_observed_revenue_of_account_id.sql`). **403** `ONLYFANS_BILLING_BLOCKED` applies similarly on mixed OF/Fansly routes; **disconnect**, **OF/Fansly sync**, and **check-connection** stay available so the user can recover.
- `GET app/api/fans/classify/activity` — session auth; returns `messages_last_1min`, `active_chats_tracked`, and `tracked_preview` from DM cache + Fansly conversation messages (optional `?platform=onlyfans|fansly|all`).
- `GET app/api/fans/classify/onlyfans-lists` — session auth; returns `{ lists: { id, name }[] }` for the connected OnlyFans account (list picker).
- `POST app/api/onlyfans/scan-chats-to-crm` — session auth; `step: "fetch_page"` paginates DM chats, `step: "detail_batch"` fetches `/fans/{id}` and upserts subscription/spend into `fans`. Client loops until all threads are processed.
- `GET app/api/onlyfans/messages/[fanId]` — requires an active OnlyFans connection (`platform_connections` connected with token). Cache-first: loads cache and connection in parallel; if disconnected, returns 400 and deletes that user’s rows in `onlyfans_dm_message_cache` (no local DM history while disconnected). When connected and cached rows exist, returns immediately (`source: "cache"`), then may refresh from OnlyFans in `after()` unless the newest `synced_at` among returned rows is within ~10s (coalesces rapid re-opens). Use `refresh=1` to force a live OnlyFans fetch (fall back to stale cache on platform errors unless the failure is “not connected”, in which case the user’s DM cache is cleared). Optional `before` still goes straight to OnlyFans for pagination. Cached payloads may include `_creatix.removedFromPlatformAt` when a message was deleted on OnlyFans but retained locally (see migration `055_onlyfans_dm_cache_soft_delete.sql`). Cache reads can return up to 500 rows per thread so history exceeds a single OF page; default `limit` is 100 (capped at 100 for live OF fetches). Disconnecting OnlyFans (or session-expiry auto-disconnect) clears the creator’s DM cache across the app.
- `DELETE app/api/onlyfans/messages/[fanId]/cache/[messageId]` — removes one row from `onlyfans_dm_message_cache` for the signed-in creator (Creatix-only; does not call OnlyFans).
- `POST app/api/ai/caption-generator` — accepts optional `image` (base64 `data:image/...` URL) for vision captions; text/voice description optional when an image is provided. Video clients should send a single frame as an image.
- `POST app/api/ai/fantasy-writer` — optional `calendarEventSummary`, `scheduledContentSummary`, `fanProfileSummary` (with `scenario` / `tone` / `platform`); at least one of scenario or any summary must be provided.
- `POST app/api/ai/mimic-test-realtime` — WebRTC SDP handshake for Realtime Mimic interrogatory voice sessions (intro + adaptive Q/A flow).
- `POST app/api/divine/voice-tool` — now also supports Mimic voice tools: `mimic_record_answer` (live transcript persistence) and `mimic_finalize_interview` (profile refinement + persist to `divine_manager_settings.mimic_profile`).
- `GET app/api/ariadne/exports/[id]/evidence` — session auth; returns authoritative evidence package: canonical trace export, immutable hash chain, and latest detect events. Markit service calls can use `v1.1` signed headers on write endpoints (`POST /api/ariadne/embed`, `POST /api/ariadne/detect`) with nonce + idempotency replay protection.
- `POST app/api/ariadne/embed-v2` — session auth; queues async `ariadne_embed_v2` jobs (FFmpeg worker path) when `ARIADNE_V2_EMBED_ENABLED=true`.
- `POST app/api/ariadne/detect-v2` — session auth; robust multi-frame detector with confidence + candidate payload outputs when `ARIADNE_V2_DETECT_ENABLED=true`.
- `GET app/api/ariadne/evidence/[exportId]` — canonical legal packet endpoint (`?format=packet` for JSON packet envelope).
