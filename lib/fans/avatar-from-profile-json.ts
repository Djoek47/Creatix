/**
 * Best-effort avatar URL from stored thread-scan `profile_json` (OnlyFans/Fansly shapes vary).
 */
export function avatarUrlFromInsightProfileJson(profileJson: unknown): string | null {
  if (!profileJson || typeof profileJson !== 'object') return null
  const o = profileJson as Record<string, unknown>

  const asHttp = (v: unknown): string | null =>
    typeof v === 'string' && v.trim().startsWith('http') ? v.trim() : null

  for (const key of ['avatar', 'avatarUrl', 'avatar_url', 'picture', 'photo']) {
    const u = asHttp(o[key])
    if (u) return u
  }

  const user = o.user
  if (user && typeof user === 'object') {
    const uo = user as Record<string, unknown>
    for (const key of ['avatar', 'avatarUrl', 'avatar_url']) {
      const u = asHttp(uo[key])
      if (u) return u
    }
  }

  const thumbs = o.avatarThumbs ?? o.avatar_thumbs
  if (thumbs && typeof thumbs === 'object') {
    const t = thumbs as Record<string, unknown>
    for (const k of ['c144', 'w108', 'w480', 'large', 'medium', 'small']) {
      const u = asHttp(t[k])
      if (u) return u
    }
  }

  return null
}
