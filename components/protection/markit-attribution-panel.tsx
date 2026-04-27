'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Fingerprint, Loader2, Lock, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { MarkitAttributionResult } from '@/lib/ariadne/attribution-types'

type AnalyzeResponse = MarkitAttributionResult & { creditsCharged?: number; error?: string }

type Props = {
  className?: string
}

/** External MarkIt trace lab (beta). */
const MARKIT_EXTERNAL_TRACE_URL = 'https://markit-fawn.vercel.app/trace'

/**
 * In-app upload still runs through our API — keep blocked until the dual-layer pipeline is fully wired.
 * Set to `false` when ready to ship in-dashboard analysis.
 */
const MARKIT_IN_APP_TEASER = true

/**
 * Countdown shown for “full in-app integration” (cosmetic urgency). Update when you target a release window.
 * Default: ~48h after Apr 27, 2026 (handoff context).
 */
const MARKIT_COUNTDOWN_END_MS = new Date('2026-04-29T12:00:00.000Z').getTime()

function useCountdownMs(targetMs: number) {
  const [remaining, setRemaining] = useState(() => Math.max(0, targetMs - Date.now()))

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, targetMs - Date.now()))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [targetMs])

  return remaining
}

function formatCountdownParts(totalMs: number) {
  const s = Math.floor(totalMs / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return { d, h, m, s: sec }
}

/**
 * DMCA / Protection: upload a suspect image or video and run dual-layer MarkIt attribution
 * (in-band append-v1 + microdot heuristics from detect-v2).
 */
export function MarkitAttributionPanel({ className }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<AnalyzeResponse | null>(null)

  const countdownLeft = useCountdownMs(MARKIT_COUNTDOWN_END_MS)
  const parts = formatCountdownParts(countdownLeft)
  const blocked = MARKIT_IN_APP_TEASER

  const run = async () => {
    if (blocked || !file) return
    setBusy(true)
    setErr(null)
    setResult(null)
    try {
      const form = new FormData()
      form.set('file', file)
      form.set('includeExport', 'true')
      const res = await fetch('/api/ariadne/analyze', { method: 'POST', body: form })
      const data = (await res.json().catch(() => ({}))) as AnalyzeResponse
      if (!res.ok) {
        setErr(typeof data.error === 'string' ? data.error : `Request failed (${res.status})`)
        return
      }
      setResult(data)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/80 bg-gradient-to-br from-violet-500/5 to-card/40 p-4 shadow-sm sm:p-6',
        className,
      )}
    >
      <div>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-violet-500/15 p-2.5 ring-1 ring-violet-500/25">
              <Fingerprint className="h-5 w-5 text-violet-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight">MarkIt &amp; Ariadne attribution</h2>
                {blocked ? (
                  <Badge
                    variant="secondary"
                    className="border-amber-500/35 bg-amber-500/15 text-amber-100"
                  >
                    Beta
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload a re-uploaded image or video from a leak site. We scan for in-file forensic markers and microdot
                patterns to tie the sample to your traces — then you can use it as evidence in a DMCA draft.
              </p>
            </div>
          </div>
        </div>

        {blocked ? (
          <div className="mb-4 space-y-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-foreground">
              <Lock className="h-4 w-4 shrink-0 text-violet-300" aria-hidden />
              <span className="font-medium">In-dashboard analysis is paused for this beta.</span>
            </div>
            <p className="text-muted-foreground">
              Use the standalone MarkIt trace lab to test forensic matching while we finish the full Creatix integration.
            </p>
            <a
              href={MARKIT_EXTERNAL_TRACE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-violet-300 underline decoration-violet-500/40 underline-offset-2 hover:text-violet-200"
            >
              Open MarkIt trace (beta)
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
            <div className="flex flex-wrap items-center gap-3 border-t border-border/50 pt-3">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Full in-app integration
              </span>
              <div
                className="flex flex-wrap gap-2 font-mono text-sm tabular-nums text-foreground"
                aria-live="polite"
              >
                <span className="rounded-md border border-border/60 bg-background/60 px-2 py-1">
                  {parts.d}d
                </span>
                <span className="rounded-md border border-border/60 bg-background/60 px-2 py-1">
                  {String(parts.h).padStart(2, '0')}h
                </span>
                <span className="rounded-md border border-border/60 bg-background/60 px-2 py-1">
                  {String(parts.m).padStart(2, '0')}m
                </span>
                <span className="rounded-md border border-border/60 bg-background/60 px-2 py-1">
                  {String(parts.s).padStart(2, '0')}s
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label
            className={cn(
              'flex flex-1 flex-col gap-1.5 text-xs text-muted-foreground',
              blocked ? 'cursor-not-allowed' : 'cursor-pointer',
            )}
          >
            <span className="font-medium">Suspect file</span>
            <input
              type="file"
              accept="image/*,video/*"
              disabled={blocked}
              className={cn(
                'text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5',
                blocked && 'opacity-60',
              )}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
                setResult(null)
                setErr(null)
              }}
            />
          </label>
          {blocked ? (
            <Button asChild className="shrink-0 gap-2">
              <a
                href={MARKIT_EXTERNAL_TRACE_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                Test it out
              </a>
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!file || busy}
              onClick={() => void run()}
              className="shrink-0 gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {busy ? 'Analyzing…' : 'Analyze sample'}
            </Button>
          )}
        </div>
        {err ? <p className="mt-3 text-sm text-destructive">{err}</p> : null}
        {result && !blocked ? (
          <div className="mt-4 space-y-2 rounded-lg border border-border/60 bg-background/50 p-3 text-sm">
            <p>
              <span className="text-muted-foreground">Markit match:</span>{' '}
              <span className="font-medium text-foreground">{result.is_markit ? 'Yes' : 'No'}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Method:</span> {result.detection_method} ·
              <span className="text-muted-foreground"> Confidence:</span> {result.confidence}%
            </p>
            {result.user_id ? (
              <p>
                <span className="text-muted-foreground">User from marker:</span> {result.user_id}
              </p>
            ) : null}
            {result.watermark_id ? (
              <p className="break-all">
                <span className="text-muted-foreground">Watermark / payload id:</span> {result.watermark_id}
              </p>
            ) : null}
            {result.evidence?.export ? (
              <p className="text-xs text-muted-foreground">
                Linked trace export: {result.evidence.export.id} (content {result.evidence.export.content_id ?? '—'})
              </p>
            ) : null}
            {typeof result.creditsCharged === 'number' ? (
              <p className="text-xs text-muted-foreground">Credits: {result.creditsCharged}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
