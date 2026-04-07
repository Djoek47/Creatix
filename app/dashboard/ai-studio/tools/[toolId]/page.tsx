'use client'

import { Suspense, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AIToolsSelector } from '@/components/ai/ai-tools-selector'

function ToolRunnerInner() {
  const params = useParams()
  const router = useRouter()
  const toolId = typeof params?.toolId === 'string' ? params.toolId : ''

  useEffect(() => {
    if (toolId === 'caption-generator') {
      router.replace('/dashboard/ai-studio/tools/content-ideas?tab=captions')
    }
    if (toolId === 'commenter') {
      router.replace('/dashboard/commenter')
    }
    if (toolId === 'housekeeping') {
      router.replace('/dashboard/commenter?section=housekeeping')
    }
    if (toolId === 'ai-chatter') {
      router.replace('/dashboard/ai-studio/chatter')
    }
    if (toolId === 'whale-whisperer') {
      router.replace('/dashboard/ai-studio/chatter?profile=whale_whisper')
    }
    if (toolId === 'retention-tease') {
      router.replace('/dashboard/retention/churn#future-tease')
    }
    if (toolId === 'voice-cloning' || toolId === 'venus-attraction') {
      router.replace('/dashboard/ai-studio/tools')
    }
    if (toolId === 'price-optimizer' || toolId === 'viral-predictor' || toolId === 'dm-bundle-pricing') {
      router.replace('/dashboard/divine-manager')
    }
    if (toolId === 'leak-scanner' || toolId === 'dmca-automator' || toolId === 'circe-protection-shield') {
      router.replace('/dashboard/protection/aegis')
    }
  }, [toolId, router])

  if (toolId === 'caption-generator') {
    return null
  }
  if (toolId === 'commenter' || toolId === 'housekeeping') {
    return null
  }
  if (
    toolId === 'ai-chatter' ||
    toolId === 'whale-whisperer' ||
    toolId === 'retention-tease' ||
    toolId === 'voice-cloning' ||
    toolId === 'venus-attraction' ||
    toolId === 'price-optimizer' ||
    toolId === 'viral-predictor' ||
    toolId === 'dm-bundle-pricing' ||
    toolId === 'leak-scanner' ||
    toolId === 'dmca-automator' ||
    toolId === 'circe-protection-shield'
  ) {
    return null
  }

  return (
    <div className="space-y-6">
      <AIToolsSelector
        initialToolId={toolId || undefined}
        backHref="/dashboard/ai-studio/tools"
      />
    </div>
  )
}

export default function ToolRunnerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
          Loading tool…
        </div>
      }
    >
      <ToolRunnerInner />
    </Suspense>
  )
}
