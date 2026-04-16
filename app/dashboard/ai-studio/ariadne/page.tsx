import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AriadneTracePanel } from '@/components/ai/ariadne-trace-panel'

export default function AriadneTracePage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Link
        href="/dashboard/ai-studio"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to AI Studio
      </Link>
      <AriadneTracePanel />
    </div>
  )
}
