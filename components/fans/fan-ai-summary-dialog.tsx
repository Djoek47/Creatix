'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { parseFanSummaryForDisplay } from '@/lib/fans/fan-ai-summary-display'

export function FanAiSummaryDialog({
  open,
  onOpenChange,
  platformFanId,
  fanLabel,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  platformFanId: string | null
  fanLabel: string
}) {
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<unknown>(null)
  const [pending, setPending] = useState(false)

  const display = useMemo(() => parseFanSummaryForDisplay(payload, pending), [payload, pending])

  const load = useCallback(async () => {
    if (!platformFanId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/onlyfans/fans/${encodeURIComponent(platformFanId)}/summary`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load summary')
      setPayload(data.data ?? data)
      setPending(Boolean(data.pending))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setPayload(null)
      setPending(false)
    } finally {
      setLoading(false)
    }
  }, [platformFanId])

  useEffect(() => {
    if (open && platformFanId) void load()
  }, [open, platformFanId, load])

  const generate = async () => {
    if (!platformFanId) return
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/onlyfans/fans/${encodeURIComponent(platformFanId)}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start generation')
      setPending(true)
      setPayload(data.data ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setGenerating(false)
    }
  }

  const completedButEmpty =
    !display.isProcessing &&
    !display.isFailed &&
    display.fields.length === 0 &&
    (display.status === 'completed' || display.status === 'ready')

  const formatWhen = (iso: string) => {
    try {
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return iso
      return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    } catch {
      return iso
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-400" />
            Fan AI summary
          </DialogTitle>
          <DialogDescription>
            {fanLabel}. Uses OnlyFansAPI credits (~200 when the provider finishes). We store completed summaries in your
            workspace — nothing below is raw API JSON.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={loading || !platformFanId} onClick={() => void load()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
            <Button type="button" size="sm" disabled={generating || !platformFanId} onClick={() => void generate()}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate / refresh'}
            </Button>
          </div>

          {loading && !payload ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              Loading summary…
            </div>
          ) : null}

          {display.isProcessing ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-200">Still processing</p>
              <p className="mt-1 text-muted-foreground">
                OnlyFansAPI is building this profile. Check back in a minute or tap Refresh.
              </p>
              {(display.analyzedMessageCount != null && display.analyzedMessageCount > 0) || display.lastAnalyzedAt ? (
                <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                  {display.analyzedMessageCount != null && display.analyzedMessageCount > 0 ? (
                    <li>Messages analyzed so far: {display.analyzedMessageCount}</li>
                  ) : null}
                  {display.lastAnalyzedAt ? <li>Last update: {formatWhen(display.lastAnalyzedAt)}</li> : null}
                </ul>
              ) : null}
            </div>
          ) : null}

          {display.isFailed ? (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {display.errorMessage || 'Summary could not be completed. Try Generate / refresh again.'}
            </p>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {!display.isProcessing && display.fields.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-violet-300/90 dark:text-violet-200/80">
                Profile signals
              </p>
              <ul className="space-y-2 rounded-xl border border-violet-500/20 bg-violet-950/20 p-3 dark:bg-violet-950/30">
                {display.fields.map((row) => (
                  <li key={row.key} className="border-b border-border/40 pb-2 last:border-0 last:pb-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{row.label}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-foreground">{row.value}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {completedButEmpty ? (
            <div className="rounded-lg border border-border bg-muted/25 px-3 py-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Summary finished</p>
              <p className="mt-1">
                No personality lines were returned yet. More back-and-forth in DMs usually helps the next run.
              </p>
              {platformFanId ? (
                <Button variant="link" className="mt-1 h-auto p-0 text-primary" asChild>
                  <Link
                    href={`/dashboard/messages?fanId=${encodeURIComponent(platformFanId)}`}
                    className="inline-flex items-center gap-1"
                  >
                    <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                    Open Messages with this fan
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}

          {!loading &&
          !display.isProcessing &&
          !display.isFailed &&
          !error &&
          display.fields.length === 0 &&
          !completedButEmpty && (
            <p className="text-sm text-muted-foreground">
              {payload == null
                ? 'No summary on file yet. Tap Generate / refresh to start.'
                : 'Nothing to show yet — try Refresh, or generate again after more chat history exists.'}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
