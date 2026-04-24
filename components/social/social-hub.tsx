'use client'

import { useCallback, useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SocialPromotion } from '@/components/social/social-promotion'
import { SocialConnectedLinks } from '@/components/social/social-connected-links'
import type { SocialConnectionRow } from '@/components/social/social-connected-links'
import { CommunityLinksManager } from '@/components/community/community-links-manager'
import { SocialReputationWidget } from '@/components/dashboard/social-reputation-widget'
import { MessageSquare, Link2, Radar } from 'lucide-react'
import { cn } from '@/lib/utils'

type HubTab = 'create' | 'links' | 'reputation'

function tabFromHash(): HubTab {
  if (typeof window === 'undefined') return 'create'
  const h = window.location.hash.replace(/^#/, '').toLowerCase()
  if (h === 'reputation' || h === 'rep') return 'reputation'
  if (h === 'links' || h === 'link-hub') return 'links'
  return 'create'
}

export function SocialHub({ connections }: { connections: SocialConnectionRow[] }) {
  const [tab, setTab] = useState<HubTab>('create')

  const applyHash = useCallback(() => {
    const next = tabFromHash()
    setTab(next)
    if (next === 'reputation') {
      requestAnimationFrame(() => {
        document.getElementById('reputation')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [])

  useEffect(() => {
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [applyHash])

  const onTabChange = (value: string) => {
    const v = value as HubTab
    setTab(v)
    if (typeof window !== 'undefined') {
      const next = v === 'create' ? '' : `#${v}`
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${next}`)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <Tabs value={tab} onValueChange={onTabChange} className="w-full space-y-8">
        <div className="rounded-2xl border border-border/70 bg-muted/20 p-1.5 shadow-sm sm:p-1">
          <TabsList className="grid h-auto w-full grid-cols-1 gap-1 bg-transparent p-0 sm:grid-cols-3">
            <TabsTrigger
              value="create"
              className={cn(
                'rounded-xl py-3 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm',
                'data-[state=inactive]:text-muted-foreground',
              )}
            >
              <span className="flex items-center justify-center gap-2">
                <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />
                Create
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="links"
              className={cn(
                'rounded-xl py-3 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm',
                'data-[state=inactive]:text-muted-foreground',
              )}
            >
              <span className="flex items-center justify-center gap-2">
                <Link2 className="h-4 w-4 shrink-0" aria-hidden />
                Link hub
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="reputation"
              className={cn(
                'rounded-xl py-3 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm',
                'data-[state=inactive]:text-muted-foreground',
              )}
            >
              <span className="flex items-center justify-center gap-2">
                <Radar className="h-4 w-4 shrink-0" aria-hidden />
                Reputation
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="create" className="mt-0 min-w-0 focus-visible:outline-none">
          <SocialPromotion connections={connections} />
        </TabsContent>

        <TabsContent value="links" className="mt-0 space-y-10 focus-visible:outline-none">
          <SocialConnectedLinks connections={connections} />
          <CommunityLinksManager />
        </TabsContent>

        <TabsContent value="reputation" className="mt-0 focus-visible:outline-none">
          <section id="reputation" className="scroll-mt-24">
            <SocialReputationWidget variant="full" />
          </section>
        </TabsContent>
      </Tabs>
    </div>
  )
}
