'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PenTool, Sparkles } from 'lucide-react'
import { AIToolsLibrary } from '@/components/ai/ai-tools-library'
import { MediaVaultHub } from '@/components/ai/media-vault-hub'

export default function AIStudioPage() {
  const searchParams = useSearchParams()

  const initialTab = (() => {
    const tab = searchParams.get('tab')
    if (tab === 'tools') return 'tools'
    if (tab === 'library' || tab === 'vault') return 'library'
    if (tab === 'cosmic' || tab === 'chatter' || tab === 'overview') return 'library'
    const ai = searchParams.get('ai')
    if (ai === 'circe' || ai === 'venus') return 'library'
    return 'library'
  })()

  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'tools') setActiveTab('tools')
    else if (tab === 'library' || tab === 'vault') setActiveTab('library')
    else if (tab === 'cosmic' || tab === 'chatter' || tab === 'overview') setActiveTab('library')
    else if (searchParams.get('ai') === 'circe' || searchParams.get('ai') === 'venus') setActiveTab('library')
  }, [searchParams])

  return (
    <div className="min-w-0 space-y-5">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 sm:inline-flex sm:w-auto sm:gap-2">
          <TabsTrigger
            value="library"
            className="rounded-xl border border-border/80 bg-card/80 px-4 py-3 text-sm font-medium shadow-sm transition-all data-[state=active]:border-amber-500/40 data-[state=active]:bg-amber-500/5 data-[state=active]:shadow-[0_0_24px_-8px_rgba(251,191,36,0.35)] sm:py-2.5"
          >
            <span className="flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
              Media &amp; vault
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="tools"
            data-tour="ai-studio-tools-tab"
            className="group/aitools rounded-xl border border-border/80 bg-card/80 px-4 py-3 text-sm font-medium shadow-sm transition-all data-[state=active]:border-purple-500/35 data-[state=active]:bg-purple-500/[0.06] data-[state=active]:shadow-[0_0_28px_-6px_rgba(168,85,247,0.35)] data-[state=inactive]:opacity-80 sm:py-2.5"
          >
            <span className="flex items-center justify-center gap-2">
              <PenTool className="ai-tools-brand-icon h-4 w-4 shrink-0" aria-hidden />
              <span className="ai-tools-wordmark text-base font-semibold">Tools</span>
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="mt-0 focus-visible:outline-none">
          <MediaVaultHub />
        </TabsContent>

        <TabsContent value="tools" className="mt-0 focus-visible:outline-none">
          <AIToolsLibrary />
        </TabsContent>
      </Tabs>
    </div>
  )
}
