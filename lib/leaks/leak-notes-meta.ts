/** Parse JSON-ish notes on leak_alerts for AI triage display. */

export type LeakNotesMeta = {
  urgency?: string
  rationale?: string
  pageVerified?: boolean
  /** How page verify was run: live HTML fetch vs scan title/snippet only. */
  pageVerifySource?: 'live_fetch' | 'metadata_fallback'
  evidenceAccessibility?: string
  reviewConclusion?: string
  distributionNuance?: string
  suggestedUserAction?: string
  contactHint?: string
  contactUrl?: string
  contactEmail?: string
}

export function parseLeakMeta(notes: string | null): LeakNotesMeta {
  try {
    const j = JSON.parse(notes || '{}') as {
      grok?: {
        urgency?: string
        rationale?: string
        evidenceAccessibility?: string
        reviewConclusion?: string
        distributionNuance?: string
        suggestedUserAction?: string
        contactHint?: string
        contactUrl?: string
        contactEmail?: string
      }
      pageVerify?: { verifiedLikelyMatch?: boolean; excerptSource?: string }
    }
    const g = j.grok
    const pv = j.pageVerify
    const excerptSource =
      pv?.excerptSource === 'metadata_fallback' || pv?.excerptSource === 'live_fetch' ? pv.excerptSource : undefined
    return {
      urgency: g?.urgency,
      rationale: g?.rationale,
      pageVerified: pv?.verifiedLikelyMatch,
      pageVerifySource: excerptSource,
      evidenceAccessibility: g?.evidenceAccessibility,
      reviewConclusion: g?.reviewConclusion,
      distributionNuance: g?.distributionNuance,
      suggestedUserAction: g?.suggestedUserAction,
      contactHint: g?.contactHint,
      contactUrl: g?.contactUrl,
      contactEmail: g?.contactEmail,
    }
  } catch {
    return {}
  }
}

export function formatNotesLine(notes: string | null): string {
  const m = parseLeakMeta(notes)
  const parts: string[] = []
  if (m.urgency) parts.push(`Urgency: ${m.urgency}`)
  if (m.rationale) parts.push(m.rationale)
  if (m.pageVerified != null) {
    const src =
      m.pageVerifySource === 'metadata_fallback' ? 'scan metadata only' : m.pageVerifySource === 'live_fetch' ? 'live page' : null
    parts.push(
      `Page verify: ${m.pageVerified ? 'likely match' : 'unclear'}${src ? ` (${src})` : ''}`,
    )
  }
  if (parts.length) return parts.join(' · ')
  try {
    const j = JSON.parse(notes || '{}') as { title?: string; snippet?: string }
    return [j.title, j.snippet].filter(Boolean).join(' · ').slice(0, 280)
  } catch {
    return notes?.slice(0, 200) || ''
  }
}
