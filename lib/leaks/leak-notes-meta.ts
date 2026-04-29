/** Parse JSON-ish notes on leak_alerts for AI triage display. */

export type LeakNotesMeta = {
  urgency?: string
  rationale?: string
  pageVerified?: boolean
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
      pageVerify?: { verifiedLikelyMatch?: boolean }
    }
    const g = j.grok
    return {
      urgency: g?.urgency,
      rationale: g?.rationale,
      pageVerified: j.pageVerify?.verifiedLikelyMatch,
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
  if (m.pageVerified != null) parts.push(`Page verify: ${m.pageVerified ? 'likely match' : 'unclear'}`)
  if (parts.length) return parts.join(' · ')
  try {
    const j = JSON.parse(notes || '{}') as { title?: string; snippet?: string }
    return [j.title, j.snippet].filter(Boolean).join(' · ').slice(0, 280)
  } catch {
    return notes?.slice(0, 200) || ''
  }
}
