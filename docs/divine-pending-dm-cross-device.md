# Divine DM composer: cross-device sync (design)

Today, `DivineUiAction` values such as `set_dm_composer` and `schedule_dm_send` run only in the browser tab that has registered a composer bridge (`DivinePanelProvider` + Messages `ChatWindow`). Opening Divine on phone A and the Messages thread on phone B does not share that state.

## Recommended direction (follow-up sprint)

1. **Persist a pending action** when the Divine tool prepares a DM (same payload as composer: `fan_id`, `text`, optional `media_ids`, `delay_ms`, `created_at`).
2. **Supabase table** (example name: `divine_pending_dm_actions`):

   - `id` (uuid, PK)
   - `user_id` (uuid, FK → `auth.users`, indexed)
   - `fan_id` (text)
   - `text` (text)
   - `media_ids` (text[] nullable)
   - `delay_ms` (int, default 3000)
   - `created_at`, `consumed_at` (timestamptz nullable)

3. **Writer**: Divine `send_message` prepare path (or a small API called from `runPrepareDmUiResult`) inserts one row per prepare.
4. **Reader**: Messages layout (or a thin hook) subscribes via **Supabase Realtime** `postgres_changes` on `INSERT` for `user_id = auth.uid()`, or polls if Realtime is unavailable.
5. **Apply locally**: On insert, run the same pipeline as today: `focus_fan` → `set_dm_composer` → optional `schedule_dm_send` so the composer types and the 3s ritual runs on whichever device has the thread open.
6. **Security**: RLS so `auth.uid() = user_id` only; optional `consumed_at` set when a client applies the action so duplicate tabs can ignore stale rows.

Native apps would need the same subscription + bridge registration; **mobile web** (`/dashboard/messages`) is the first target.
