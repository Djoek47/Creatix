# OnlyFans Route Inventory (Robustness Baseline)

This inventory documents current request flow and failure behavior for the high-risk OnlyFans routes used by inbox, thread view, mass messaging, and webhook ingest.

## Web inbox and thread paths

- `GET /api/messages/inbox` (`app/api/messages/inbox/route.ts`)
  - **Purpose:** Unified inbox list (OnlyFans + Fansly), CRM enrichment, filtering.
  - **OF dependency:** `createOnlyFansAPI().getConversations(...)`.
  - **Failure behavior today:**
    - `platform=onlyfans`: returns 401 with `ONLYFANS_SESSION_EXPIRED` when session expired.
    - `platform=all`: can return partial data with `meta.errors` values like `onlyfans_fetch_failed`.
    - Client currently does not fully surface provider-degraded states.

- `GET /api/onlyfans/messages/:fanId` (`app/api/onlyfans/messages/[fanId]/route.ts`)
  - **Purpose:** Thread messages for one fan.
  - **OF dependency:** `OnlyFansAPI.getMessages(...)`.
  - **Cache dependency:** `lib/messages/of-dm-cache.ts` (stale/fallback logic).
  - **Failure behavior today:**
    - Returns 429 with `ONLYFANS_RATE_LIMIT` on detected rate-limit conditions.
    - Can return stale cache on refresh failure.
    - Client clears active thread state before fetch resolves (causes false-empty flash on transient errors).

- `GET /api/onlyfans/conversations` (`app/api/onlyfans/conversations/route.ts`)
  - **Purpose:** OnlyFans-only conversation listing for non-unified clients.
  - **OF dependency:** `OnlyFansAPI.getConversations(...)`.
  - **Failure behavior today:**
    - Session-expired handling returns structured 401.
    - `unreadOnly` query is parsed but not applied in client request builder (`lib/onlyfans-api.ts`) pre-fix.

## Message send and mass messaging

- `POST /api/onlyfans/messages/:fanId` (`app/api/onlyfans/messages/[fanId]/route.ts`)
  - **Purpose:** Send one message in one thread.
  - **OF dependency:** `OnlyFansAPI.sendMessage(...)`.
  - **Failure behavior today:** Generic send failures; no centralized retry policy in client library.

- `POST /api/onlyfans/messages/mass` (`app/api/onlyfans/messages/mass/route.ts`)
  - **Purpose:** OnlyFans-specific mass send.
  - **OF dependency:** `OnlyFansAPI.sendMassMessage(...)`.
  - **Failure behavior today:** Generic 500 on exceptions, no explicit 429 mapping.

- `POST /api/messages/mass` (`app/api/messages/mass/route.ts`)
  - **Purpose:** Cross-platform mass send orchestrator.
  - **OF dependency:** `OnlyFansAPI.sendMassMessage(...)`.
  - **Failure behavior today:** Platform-level errors captured in result object, but no normalized 429 code contract.

## Chat actions

- `DELETE /api/onlyfans/chats/:chatId` (`app/api/onlyfans/chats/[chatId]/route.ts`)
  - **Purpose:** Delete a chat.
  - **Failure behavior today:** Handler bug (undefined request variable) pre-fix.

- `POST /api/onlyfans/chats/:chatId/read` and `.../unread`
  - **Purpose:** Thread read-state actions.
  - **OF dependency:** `markChatAsRead`, `markChatAsUnread`.
  - **Failure behavior today:** Standard route-level failures, no centralized backoff.

## Webhook ingest

- `POST /api/onlyfans/webhook` (`app/api/onlyfans/webhook/route.ts`)
  - **Purpose:** Inbound events for messages, tips, subscriptions, queue updates, deletes.
  - **Critical behavior:**
    - Signature verification is optional based on env/header presence.
    - No global event ledger dedupe for all event types pre-hardening.
    - Individual comment ingest path is idempotent (`idempotency_key`) but not all events are.

## Known high-impact failure modes (before hardening)

- False-empty thread while loading due to eager `setMessages([])` in `chat-window`.
- Hidden partial provider failures (`meta.errors` not user-visible).
- Non-uniform rate-limit handling across routes (some map to 429, others generic 500).
- Missing centralized retry/throttle policy in `lib/onlyfans-api.ts`.
- Broken DELETE chat handler request variable.
