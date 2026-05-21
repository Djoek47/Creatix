/**
 * `calendar_teaser_notes` is stored as TEXT (max 4000).
 * v2 JSON: structured date + expectation lines for churn digest prompts.
 * Legacy: plain freeform text (pre–calendar UI).
 */

export type CalendarTeaserItem = { d: string; t: string }

type V2Payload = { v: 2; items: CalendarTeaserItem[] }

function isV2Payload(x: unknown): x is V2Payload {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  if (o.v !== 2 || !Array.isArray(o.items)) return false
  return o.items.every(
    (it) =>
      it &&
      typeof it === 'object' &&
      typeof (it as CalendarTeaserItem).d === 'string' &&
      typeof (it as CalendarTeaserItem).t === 'string',
  )
}

/** UI model: ISO date or empty for undated / legacy note. */
export type CalendarTeaserLine = { date: string; text: string }

export function parseCalendarTeaserStored(raw: string | null | undefined): CalendarTeaserLine[] {
  const t = String(raw ?? '').trim()
  if (!t) return []
  try {
    const j = JSON.parse(t) as unknown
    if (isV2Payload(j)) {
      return j.items.map((it) => ({
        date: it.d.trim(),
        text: it.t.trim(),
      }))
    }
  } catch {
    /* legacy plain text */
  }
  return [{ date: '', text: t }]
}

export function serializeCalendarTeaserStored(lines: CalendarTeaserLine[]): string | null {
  const cleaned: CalendarTeaserItem[] = lines
    .map((l) => ({ d: l.date.trim(), t: l.text.trim() }))
    .filter((l) => l.t.length > 0)

  if (cleaned.length === 0) return null

  const anyDated = cleaned.some((l) => l.d.length > 0)
  if (!anyDated) {
    return cleaned.map((l) => l.t).join('\n\n').slice(0, 4000)
  }

  const payload = JSON.stringify({ v: 2, items: cleaned } satisfies V2Payload)
  return payload.length > 4000 ? payload.slice(0, 4000) : payload
}

/** Human-readable block for LLM prompts. */
export function formatCalendarTeaserNotesForPrompt(raw: string | null | undefined): string {
  const t = String(raw ?? '').trim()
  if (!t) return '(not provided)'
  try {
    const j = JSON.parse(t) as unknown
    if (isV2Payload(j)) {
      const lines = j.items
        .map((i) => {
          const note = i.t.trim()
          if (!note) return ''
          return i.d.trim() ? `${i.d.trim()}: ${note}` : note
        })
        .filter(Boolean)
      return lines.length ? lines.join('\n') : '(not provided)'
    }
  } catch {
    /* plain */
  }
  return t
}
