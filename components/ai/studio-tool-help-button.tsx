'use client'

import { ToolHelpDialog } from '@/components/ai/tool-help-dialog'
import { cn } from '@/lib/utils'

/** Thin wrapper: use on dashboard pages where a tool redirects (Commenter, Chatter, Aegis, etc.). */
export function StudioToolHelpButton({
  toolId,
  className,
}: {
  toolId: string
  className?: string
}) {
  return <ToolHelpDialog toolId={toolId} triggerClassName={cn(className)} />
}
