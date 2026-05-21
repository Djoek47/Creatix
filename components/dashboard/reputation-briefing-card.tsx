'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, Sparkles, ExternalLink, AlertTriangle } from 'lucide-react'
import type { ReputationBriefingPayload } from '@/lib/reputation/briefing'
import { useScanIdentity } from '@/hooks/use-scan-identity'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'mentions_selected_handles'

type Props = {
  initialBriefing: ReputationBriefingPayload | null
  briefingAt: string | null
  mentionCount: number
}

function buildBriefingRequestBody(identityValues: string[]): Record<string, unknown> {
  if (identityValues.length === 0) return {}
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as string[]
    if (!Array.isArray(parsed) || parsed.length === 0) return {}
    const allowed = new Set(identityValues)
    const picked = parsed.filter((h) => allowed.has(h))
    if (picked.length === 0) return {}
    if (picked.length >= identityValues.length) return {}
    return { handles: picked }
  } catch {
    return {}
  }
}

export function ReputationBriefingCard({ initialBriefing, briefingAt, mentionCount }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { handles: identityHandles } = useScanIdentity()
  const identityValues = identityHandles.map((h) => h.value)

  const handleRefresh = async () => {
    if (identityHandles.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const body = buildBriefingRequestBody(identityValues)
      const res = await fetch('/api/social/reputation-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
    <section
      className="rounded-2xl border border-border/50 bg-muted/10 dark:bg-muted/5"
      aria-labelledby="reputation-briefing-heading"
    >
      <div className="flex flex-col gap-6 border-b border-border/40 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-6">
        <div className="min-w-0 space-y-1.5">
          <h2
            id="reputation-briefing-heading"
            className="flex flex-wrap items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            Reputation briefing
          </h2>
          <p className="max-w-lg text-[13px] leading-relaxed text-muted-foreground/88">
            From web search snippets—not a live social feed. Scope matches{' '}
            <span className="text-foreground/85">Scan web</span> above.
          </p>
          {briefingAt && initialBriefing ? (
            <p className="text-[12px] text-muted-foreground/75">
              Updated {new Date(briefingAt).toLocaleString()}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 shrink-0 rounded-xl border-border/60 bg-background/60 px-4 text-[13px] font-medium shadow-none hover:bg-muted/40"
          onClick={() => void handleRefresh()}
          disabled={loading || identityHandles.length === 0}
          title="Regenerate the aggregate briefing for your current scope"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
          {initialBriefing ? 'Refresh briefing' : 'Generate briefing'}
        </Button>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
        {error ? (
          <p className="text-[13px] text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {showEmptyBriefing ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-4 py-5 text-[13px] leading-relaxed text-muted-foreground/88">
            <p className="font-medium text-foreground">No briefing yet</p>
            <p className="mt-2">
              Add search handles in <span className="text-foreground/90">Search profile</span> below, then run{' '}
              <span className="text-foreground/90">Scan web</span>. A scan updates mentions and prepares this summary.
            </p>
            <Button variant="link" className="mt-2 h-auto p-0 text-[13px] font-medium text-foreground underline-offset-4" asChild>
              <Link href="/dashboard/settings?tab=integrations">Connect accounts (optional)</Link>
            </Button>
          </div>
        ) : null}

        {initialBriefing ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{initialBriefing.headline}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground/88">{initialBriefing.summary}</p>
            </div>

            {initialBriefing.themesPositive.length > 0 ? (
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/75">
                  What&apos;s working
                </p>
                <ul className="list-inside list-disc space-y-1.5 text-[13px] leading-relaxed text-muted-foreground/88">
                  {initialBriefing.themesPositive.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {initialBriefing.themesNegative.length > 0 ? (
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/75">
                  Friction &amp; risks
                </p>
                <ul className="list-inside list-disc space-y-1.5 text-[13px] leading-relaxed text-muted-foreground/88">
                  {initialBriefing.themesNegative.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {initialBriefing.watchlist.length > 0 ? (
              <div>
                <p className="mb-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-destructive/90">
                  <AlertTriangle className="h-3 w-3" aria-hidden />
                  High-risk mentions
                </p>
                <ul className="space-y-2.5">
                  {initialBriefing.watchlist.slice(0, 6).map((w, i) => (
                    <li
                      key={i}
                      className={cn(
                        'rounded-xl border border-destructive/15 bg-destructive/[0.06] px-3 py-2.5 text-[12px]',
                        'dark:bg-destructive/[0.08]',
                      )}
                    >
                      <a
                        href={w.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-1.5 font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-70" aria-hidden />
                        <span className="line-clamp-2 break-all">{w.title || w.url}</span>
                      </a>
                      {w.snippet ? <p className="mt-1.5 text-muted-foreground/85">{w.snippet}</p> : null}
                      {w.note ? <p className="mt-1.5 text-muted-foreground/80">{w.note}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {initialBriefing.opportunities.length > 0 ? (
              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/75">
                  Reply opportunities
                </p>
                <ul className="space-y-2.5">
                  {initialBriefing.opportunities.slice(0, 6).map((o, i) => (
                    <li
                      key={i}
                      className="rounded-xl border border-border/50 bg-background/50 px-3 py-2.5 text-[12px] dark:bg-background/30"
                    >
                      <a
                        href={o.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-1.5 font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-70" aria-hidden />
                        <span className="line-clamp-2 break-all">{o.title || o.url}</span>
                      </a>
                      {o.snippet ? <p className="mt-1.5 text-muted-foreground/85">{o.snippet}</p> : null}
                      {o.note ? <p className="mt-1.5 text-muted-foreground/80">{o.note}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {initialBriefing.overallNextSteps.length > 0 ? (
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/75">Next steps</p>
                <ul className="list-inside list-disc space-y-1.5 text-[13px] leading-relaxed text-muted-foreground/88">
                  {initialBriefing.overallNextSteps.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="text-[12px] leading-relaxed text-muted-foreground/70">{initialBriefing.disclaimer}</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
