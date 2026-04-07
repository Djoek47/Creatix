-- Per-user control of when Creatix tells OnlyFans a chat is "read" (platform read state).
-- Default: do not auto-mark; creators opt in globally and can override per thread.

CREATE TABLE IF NOT EXISTS messaging_read_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_mark_on_open boolean NOT NULL DEFAULT false,
  per_chat_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE messaging_read_preferences IS 'Global + per-thread rules for auto mark-as-read when opening a DM in Creatix (OnlyFans API)';
COMMENT ON COLUMN messaging_read_preferences.per_chat_overrides IS 'Map of "onlyfans:fanId" | "fansly:fanId" to "auto" or "never"; omit key to inherit auto_mark_on_open';

ALTER TABLE messaging_read_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY messaging_read_preferences_select_own ON messaging_read_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY messaging_read_preferences_insert_own ON messaging_read_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY messaging_read_preferences_update_own ON messaging_read_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY messaging_read_preferences_delete_own ON messaging_read_preferences
  FOR DELETE USING (auth.uid() = user_id);
