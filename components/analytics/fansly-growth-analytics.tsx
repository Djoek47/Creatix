'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, Loader2, RefreshCw, Sparkles, Trophy, Receipt, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type BlockState = {
  loading: boolean
  error?: string
  data?: unknown
}

function JsonPeek({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false)
  const text =
    data == null
      ? '—'
      : typeof data === 'string'
        ? data
        : JSON.stringify(data, null, 2)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
        Raw response
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-border bg-muted/40 p-2 text-[10px] leading-snug whitespace-pre-wrap break-all">
          {text}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  )
}

function GrowthBlockCard({
  title,
  description,
  icon: Icon,
  state,
}: {
  title: string
  description: string
  icon: LucideIcon
  state: BlockState
}) {
  return (
    <Card className="border-border/80 bg-card/80 backdrop-blur-sm transition hover:border-violet-500/25">
      <CardHeader className="space-y-1 pb-2">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 rounded-md bg-violet-500/10 p-1.5 text-violet-600 dark:text-violet-300">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-semibold leading-tight">{title}</CardTitle>
            <CardDescription className="text-[11px] leading-snug">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 text-xs">
        {state.loading ? (
          <div className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span>Loading Fansly…</span>
          </div>
        ) : state.error ? (
          <p className="py-1 text-[11px] text-destructive leading-snug">{state.error}</p>
        ) : (
          <div className="space-y-2">
            <JsonPeek data={state.data} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** Live Fansly growth surfaces: transactions, top supporters, follower graph (session + billing gated). */
export function FanslyGrowthAnalytics() {
  const [ledger, setLedger] = useState<BlockState>({ loading: true })
  const [supporters, setSupporters] = useState<BlockState>({ loading: true })
  const [followers, setFollowers] = useState<BlockState>({ loading: true })

  const run = useCallback(async () => {
    setLedger({ loading: true })
    setSupporters({ loading: true })
    setFollowers({ loading: true })

    const safe = async (setter: (s: BlockState) => void, url: string) => {
      try {
        const res = await fetch(url, { credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          const msg = typeof data.error === 'string' ? data.error : res.statusText
          throw new Error(msg || `HTTP ${res.status}`)
        }
        setter({ loading: false, data })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Request failed'
        setter({ loading: false, error: msg })
      }
    }

    void safe(setLedger, '/api/fansly/earnings/transactions?limit=20&offset=0&recentDays=30')
    void safe(setSupporters, '/api/fansly/top-supporters')
    void safe(setFollowers, '/api/fansly/followers')
  }, [])

  useEffect(() => {
    void run()
  }, [run])

  return (
    <section className="min-w-0 space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-background to-fuchsia-500/5 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-300">
              <Sparkles className="h-5 w-5 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-widest">Fansly growth</span>
            </div>
            <h3 className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight">
              <Trophy className="h-6 w-6 shrink-0 text-violet-600 dark:text-violet-300" />
              Live Fansly API data
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Transaction ledger, top supporters, and follower discovery from ApiFansly—useful for campaigns and CRM
              depth. Each card loads independently.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-2 border-violet-500/30"
            onClick={() => void run()}
          >
            <RefreshCw className="h-4 w-4" />
            Reload
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <GrowthBlockCard
          title="Earnings transactions"
          description="Recent ledger rows (last ~30 days window)."
          icon={Receipt}
          state={ledger}
        />
        <GrowthBlockCard
          title="Top supporters"
          description="Ranked by partner gross/net fields."
          icon={Trophy}
          state={supporters}
        />
        <GrowthBlockCard
          title="Followers snapshot"
          description="Follower IDs plus aggregated account rows (capped)."
          icon={Users}
          state={followers}
        />
      </div>
    </section>
  )
}
