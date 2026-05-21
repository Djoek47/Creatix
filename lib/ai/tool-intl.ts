import { resolveCanonicalToolId } from '@/lib/ai-tools-data'

/** next-intl path under namespace `ai-tools` for one tool row. */
export function aiToolCopyPath(toolId: string, field: 'name' | 'description' | 'longDescription' | 'badge'): string {
  const id = resolveCanonicalToolId(toolId)
  return `tools.${id}.${field}`
}

export type AiToolsTranslator = {
  (key: string): string
  has?(key: string): boolean
}

export function translateToolName(
  t: AiToolsTranslator,
  toolId: string,
  fallback: string,
): string {
  const key = aiToolCopyPath(toolId, 'name')
  if (t.has && !t.has(key)) return fallback
  try {
    const v = t(key)
    return v && v !== key ? v : fallback
  } catch {
    return fallback
  }
}

// Re-export for server modules that only need canonical id
export { resolveCanonicalToolId }
