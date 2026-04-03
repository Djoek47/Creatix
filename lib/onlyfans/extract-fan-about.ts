/**
 * Pull a free-text "about" / bio from OnlyFansAPI fan/user payloads (shape varies by endpoint/version).
 */
export function extractAboutFromOnlyFansFanPayload(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>

  const pick = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, 8000) : null

  const nested = (obj: unknown, keys: string[]): string | null => {
    if (!obj || typeof obj !== 'object') return null
    const r = obj as Record<string, unknown>
    for (const k of keys) {
      const p = pick(r[k])
      if (p) return p
    }
    return null
  }

  const direct = nested(o, ['about', 'bio', 'description', 'userAbout', 'aboutMe', 'profileDescription'])
  if (direct) return direct

  const fromUser = nested(o.fromUser, ['about', 'bio', 'description'])
  if (fromUser) return fromUser

  const user = nested(o.user, ['about', 'bio', 'description', 'aboutMe'])
  if (user) return user

  const profile = nested(o.profile, ['about', 'bio', 'description'])
  if (profile) return profile

  const onlyfansData = o.onlyfans_data
  if (onlyfansData && typeof onlyfansData === 'object') {
    const od = nested(onlyfansData, ['about', 'bio', 'description'])
    if (od) return od
  }

  return null
}
