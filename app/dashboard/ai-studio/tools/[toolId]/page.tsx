'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AIToolsSelector } from '@/components/ai/ai-tools-selector'

export default function ToolRunnerPage() {
  const params = useParams()
  const router = useRouter()
  const toolId = typeof params?.toolId === 'string' ? params.toolId : ''

  useEffect(() => {
    if (toolId === 'ai-chatter') {
      router.replace('/dashboard/ai-studio/chatter')
    }
    if (toolId === 'whale-whisperer') {
      router.replace('/dashboard/ai-studio/chatter?profile=whale_whisper')
    }
    if (toolId === 'leak-scanner' || toolId === 'dmca-automator' || toolId === 'circe-protection-shield') {
      router.replace('/dashboard/protection/aegis')
    }
  }, [toolId, router])

  if (
    toolId === 'ai-chatter' ||
    toolId === 'whale-whisperer' ||
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
