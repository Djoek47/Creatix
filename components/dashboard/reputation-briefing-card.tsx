'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, Sparkles, ExternalLink, AlertTriangle } from 'lucide-react'
import type { ReputationBriefingPayload } from '@/lib/reputation/briefing'
import { useScanIdentity } from '@/hooks/use-scan-identity'
import { ScanHandlePicker } from '@/components/dashboard/scan-handle-picker'

type Props = {
  initialBriefing: ReputationBriefingPayload | null
  briefingAt: string | null
  mentionCount: number
}

export function ReputationBriefingCard({ initialBriefing, briefingAt, mentionCount }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useAllHandles] = useState(false)
  const [selectedHandles, setSelectedHandles] = useState<Set<string>>(new Set())
  const { handles: identityHandles } = useScanIdentity()

  const toggleSelectedHandle = (value: string) => {
    setSelectedHandles((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('mentions_selected_handles', JSON.stringify(Array.from(next)))
      }
      return next
    })
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem('mentions_selected_handles')
      if (!raw) return
      const parsed = JSON.parse(raw) as string[]
      if (!Array.isArray(parsed)) return
      const allowed = new Set(identityHandles.map((h) => h.value))
      setSelectedHandles(new Set(parsed.filter((h) => allowed.has(h))))
    } catch {
      // ignore
    }
  }, [identityHandles])

  const handleRefresh = async () => {
    if (identityHandles.length === 0 || selectedHandles.size === 0) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/social/reputation-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handles: Array.from(selectedHandles) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not refresh briefing')
        return
      }
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const showEmptyBriefing = mentionCount === 0 && !initialBriefing

  return (
    <Card className="border-venus/20 bg-gradient-to-br from-card via-card to-venus/5">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-venus" />
            AI reputation briefing
          </CardTitle>
          <CardDescription className="text-xs">
            From web search snippets—not a live social feed. You choose every reply.
          </CardDescription>
          {briefingAt && initialBriefing && (
            <p className="text-xs text-muted-foreground">
              Last updated {new Date(briefingAt).toLocaleString()}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 border-venus/40 text-venus hover:bg-venus/10"
          onClick={() => void handleRefresh()}
          disabled={loading || identityHandles.length === 0 || selectedHandles.size === 0}
          title="Generate or refresh the aggregate AI briefing (runs a discovery pass if needed)"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {initialBriefing ? 'Refresh briefing' : 'Generate briefing'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {identityHandles.length > 0 && (
          <ScanHandlePicker
            handles={identityHandles}
            useAll={useAllHandles}
            onUseAllChange={() => undefined}
            selected={selectedHandles}
            onToggle={toggleSelectedHandle}
            idPrefix="mentions-briefing"
            allCheckboxClassName="shadow-[0_0_14px_4px] shadow-venus/35 ring-1 ring-venus/45 ring-offset-2 ring-offset-background transition-shadow focus-visible:ring-[3px] focus-visible:ring-venus/50 dark:shadow-[0_0_18px_6px] dark:shadow-venus/30"
          />
        )}

        {showEmptyBriefing && (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">No briefing snapshot yet</p>
            <p className="mt-1">
              Add <span className="text-foreground">search handles</span> in the card above, then run{' '}
              <span className="text-foreground">Scan web</span>—the scan updates mentions and also builds this aggregate
              brief. You can <span className="text-foreground">Generate briefing</span> here anytime.
            </p>
            <Button variant="link" className="mt-2 h-auto p-0 text-venus" asChild>
              <Link href="/dashboard/settings?tab=integrations">Connect accounts (optional)</Link>
            </Button>
          </div>
        )}

        {initialBriefing && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">{initialBriefing.headline}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{initialBriefing.summary}</p>
            </div>

            {initialBriefing.themesPositive.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-chart-2">What&apos;s working</p>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {initialBriefing.themesPositive.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}

            {initialBriefing.themesNegative.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Friction &amp; risks
                </p>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {initialBriefing.themesNegative.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}

            {initialBriefing.watchlist.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  High-risk / hostile mentions
                </p>
                <ul className="space-y-2">
                  {initialBriefing.watchlist.slice(0, 6).map((w, i) => (
                    <li
                      key={i}
                      className="rounded-md border border-destructive/20 bg-destructive/5 p-2 text-xs"
                    >
                      <a
                        href={w.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-1 font-medium text-foreground hover:text-venus"
                      >
                        <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
                        <span className="line-clamp-2 break-all">{w.title || w.url}</span>
                      </a>
                      {w.snippet && <p className="mt-1 text-muted-foreground">{w.snippet}</p>}
                      {w.note && <p className="mt-1 text-muted-foreground/90">{w.note}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {initialBriefing.opportunities.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">Reply opportunities</p>
                <ul className="space-y-2">
                  {initialBriefing.opportunities.slice(0, 6).map((o, i) => (
                    <li key={i} className="rounded-md border border-primary/20 bg-primary/5 p-2 text-xs">
                      <a
                        href={o.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-1 font-medium text-foreground hover:text-venus"
                      >
                        <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
                        <span className="line-clamp-2 break-all">{o.title || o.url}</span>
                      </a>
                      {o.snippet && <p className="mt-1 text-muted-foreground">{o.snippet}</p>}
                      {o.note && <p className="mt-1 text-muted-foreground/90">{o.note}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {initialBriefing.overallNextSteps.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-foreground">Next steps</p>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {initialBriefing.overallNextSteps.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-muted-foreground">{initialBriefing.disclaimer}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
