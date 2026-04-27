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
    <div className="w-full space-y-8 sm:space-y-10">
      <Tabs value={tab} onValueChange={onTabChange} className="w-full space-y-8">
        <div className="rounded-full border border-border/60 bg-muted/15 p-1">
          <TabsList className="grid h-auto w-full grid-cols-1 gap-0.5 bg-transparent p-0 sm:grid-cols-3">
            <TabsTrigger
              value="create"
              className={cn(
                'rounded-full py-2.5 text-sm font-medium transition-colors',
                'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
                'data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground/90',
              )}
            >
              <span className="flex items-center justify-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                Create
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="links"
              className={cn(
                'rounded-full py-2.5 text-sm font-medium transition-colors',
                'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
                'data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground/90',
              )}
            >
              <span className="flex items-center justify-center gap-2">
                <Link2 className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                Link hub
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="reputation"
              className={cn(
                'rounded-full py-2.5 text-sm font-medium transition-colors',
                'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
                'data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground/90',
              )}
            >
              <span className="flex items-center justify-center gap-2">
                <Radar className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
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
