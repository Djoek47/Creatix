'use client'

import { ToolHelpDialog } from '@/components/ai/tool-help-dialog'

/**
 * Small wrapper so AI Studio pages can share a consistent help affordance.
 * The underlying dialog already pulls copy + credits from `lib/ai-tools-data`.
 */
export function StudioToolHelpButton({ toolId }: { toolId: string }) {
  return <ToolHelpDialog toolId={toolId} />
}
