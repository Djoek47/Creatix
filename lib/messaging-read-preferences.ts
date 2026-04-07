export type PlatformKey = 'onlyfans' | 'fansly'

export type PerChatReadOverride = 'auto' | 'never'

export type MessagingReadPreferences = {
  auto_mark_on_open: boolean
  per_chat_overrides: Record<string, PerChatReadOverride>
}

export const DEFAULT_MESSAGING_READ_PREFS: MessagingReadPreferences = {
  auto_mark_on_open: false,
  per_chat_overrides: {},
}

export function chatReadOverrideKey(platform: PlatformKey, fanId: string): string {
  return `${platform}:${String(fanId).trim()}`
}

export function mergeMessagingReadPrefs(
  row: Partial<MessagingReadPreferences> | null | undefined,
): MessagingReadPreferences {
  const raw = row?.per_chat_overrides
  const per_chat_overrides: Record<string, PerChatReadOverride> = {}
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (v === 'auto' || v === 'never') per_chat_overrides[k] = v
    }
  }
  return {
    auto_mark_on_open: row?.auto_mark_on_open ?? DEFAULT_MESSAGING_READ_PREFS.auto_mark_on_open,
    per_chat_overrides,
  }
}

/** Whether Creatix should call the platform mark-as-read when the user opens a thread. */
export function shouldAutoMarkOnOpen(
  prefs: MessagingReadPreferences,
  platform: PlatformKey,
  fanId: string,
): boolean {
  const key = chatReadOverrideKey(platform, fanId)
  const o = prefs.per_chat_overrides[key]
  if (o === 'auto') return true
  if (o === 'never') return false
  return prefs.auto_mark_on_open
}

export function effectiveChatReadMode(
  prefs: MessagingReadPreferences,
  platform: PlatformKey,
  fanId: string,
): 'inherit' | 'auto' | 'never' {
  const key = chatReadOverrideKey(platform, fanId)
  const o = prefs.per_chat_overrides[key]
  if (o === 'auto' || o === 'never') return o
  return 'inherit'
}
