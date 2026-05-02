import aiTools from '@/messages/en/ai-tools.json'
import { resolveCanonicalToolId } from '@/lib/ai-tools-data'

type ToolRow = { name?: string; description?: string; longDescription?: string }

function rowFor(toolId: string): ToolRow | undefined {
  const c = resolveCanonicalToolId(toolId)
  const tools = (aiTools as { tools?: Record<string, ToolRow> }).tools
  return tools?.[c]
}

/** English catalog title for server logs, API prompts, and ledger metadata. */
export function englishToolName(toolId: string): string {
  return rowFor(toolId)?.name?.trim() || resolveCanonicalToolId(toolId)
}

export function englishToolDescription(toolId: string): string {
  return rowFor(toolId)?.description?.trim() || ''
}

export function englishToolLongDescription(toolId: string): string {
  return rowFor(toolId)?.longDescription?.trim() || ''
}
