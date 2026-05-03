/**
 * Best-effort extract plain text from an OpenAI Responses API object (retrieve/create JSON).
 */
export function extractResponsesOutputText(payload: Record<string, unknown>): string {
  const out = payload.output
  if (!Array.isArray(out)) return typeof payload.output_text === 'string' ? payload.output_text : ''
  const parts: string[] = []
  for (const item of out) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const content = o.content
    if (!Array.isArray(content)) continue
    for (const c of content) {
      if (!c || typeof c !== 'object') continue
      const row = c as Record<string, unknown>
      const t = row.type === 'output_text' && typeof row.text === 'string' ? row.text : ''
      const alt = typeof row.text === 'string' ? row.text : ''
      const piece = t || alt
      if (piece.trim()) parts.push(piece.trim())
    }
  }
  return parts.join('\n').trim()
}
