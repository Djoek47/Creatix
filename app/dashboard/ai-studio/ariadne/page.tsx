import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { AriadneTracePanel } from '@/components/ai/ariadne-trace-panel'
import { StudioBackLink } from '@/components/ai/studio-back-link'
import { StudioToolHelpButton } from '@/components/ai/studio-tool-help-button'
import { getToolMeta } from '@/lib/ai-tools-data'

export default function AriadneTracePage() {
  if (getToolMeta('ariadne-trace')?.comingSoon) {
    redirect('/dashboard/ai-studio/tools')
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StudioBackLink href="/dashboard/ai-studio/tools" aria-label="Back to tools" />
        <StudioToolHelpButton toolId="ariadne-trace" />
      </div>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading Ariadne...</div>}>
        <AriadneTracePanel />
      </Suspense>
    </div>
  )
}
