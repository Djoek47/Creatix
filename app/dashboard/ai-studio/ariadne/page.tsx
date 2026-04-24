import Link from 'next/link'
import { Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'
import { AriadneTracePanel } from '@/components/ai/ariadne-trace-panel'
import { StudioToolHelpButton } from '@/components/ai/studio-tool-help-button'

export default function AriadneTracePage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/ai-studio"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to AI Studio
        </Link>
        <StudioToolHelpButton toolId="ariadne-trace" />
      </div>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading Ariadne...</div>}>
        <AriadneTracePanel />
      </Suspense>
    </div>
  )
}
