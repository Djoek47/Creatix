export type ParsedChurnFanSignal = {
  fanId: string
  risk: string
  one_line: string
}

/**
 * Extracts trailing ```json ... ``` block from Churn digest model output.
 */
export function extractChurnFanSignalsFromDigest(markdown: string): ParsedChurnFanSignal[] {
  const m = markdown.match(/```json\s*([\s\S]*?)```/i)
  const raw = m?.[1]?.trim()
  if (!raw) return []
  try {
    const j = JSON.parse(raw) as { fans?: unknown }
    if (!Array.isArray(j.fans)) return []
    const out: ParsedChurnFanSignal[] = []
    for (const row of j.fans) {
      if (!row || typeof row !== 'object') continue
      const o = row as Record<string, unknown>
      const fanId = typeof o.fanId === 'string' ? o.fanId.trim() : ''
      const risk = typeof o.risk === 'string' ? o.risk.trim() : ''
      const one_line = typeof o.one_line === 'string' ? o.one_line.trim() : ''
      if (!fanId) continue
      out.push({ fanId, risk: risk || 'unknown', one_line: one_line || '' })
    }
    return out
  } catch {
    return []
  }
}

export function normalizeRiskLevel(raw: string): 'low' | 'medium' | 'high' | 'critical' | 'unknown' {
  const s = raw.toLowerCase()
  if (s.includes('critical')) return 'critical'
  if (s.includes('high')) return 'high'
  if (s.includes('medium')) return 'medium'
  if (s.includes('low')) return 'low'
  return 'unknown'
}
