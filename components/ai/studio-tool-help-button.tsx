'use client'

import { ToolHelpDialog } from '@/components/ai/tool-help-dialog'

/**
 * Small wrapper so AI Studio pages can share a consistent help affordance.
 * The underlying dialog pulls copy + credits from per-locale `messages` … `ai-tools.json`.
 */
export function StudioToolHelpButton({ toolId }: { toolId: string }) {
  return <ToolHelpDialog toolId={toolId} />
}
