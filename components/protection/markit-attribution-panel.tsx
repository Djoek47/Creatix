'use client'

import { useState } from 'react'
import { ExternalLink, Fingerprint, Loader2, Lock, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { MarkitAttributionResult } from '@/lib/ariadne/attribution-types'
import { formatCountdownParts, useCountdownMs, useIntegrationCountdownEndMs } from '@/hooks/use-integration-countdown'

type AnalyzeResponse = MarkitAttributionResult & { creditsCharged?: number; error?: string }

type Props = {
  className?: string
}

/** External MarkIt trace lab (coming soon in-product). */
const MARKIT_EXTERNAL_TRACE_URL = 'https://markit-fawn.vercel.app/trace'
/** When false, no `<a href>` to the hosted lab (banner + “Test it out”). */
const MARKIT_EXTERNAL_TRACE_LINK_ENABLED = false

/**
 * In-app upload still runs through our API — keep blocked until the dual-layer pipeline is fully wired.
 * Set to `false` when ready to ship in-dashboard analysis.
 */
const MARKIT_IN_APP_TEASER = true

/**
 * DMCA / Protection: upload a suspect image or video and run dual-layer MarkIt attribution
 * (in-band append-v1 + microdot heuristics from detect-v2).
 */
export function MarkitAttributionPanel({ className }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<AnalyzeResponse | null>(null)

  const countdownEnd = useIntegrationCountdownEndMs()
  const countdownLeft = useCountdownMs(countdownEnd)
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
              <Fingerprint className="h-5 w-5 text-violet-700 dark:text-violet-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight">MarkIt &amp; Ariadne attribution</h2>
                {blocked ? (
                  <Badge
                    variant="secondary"
                    className="border-violet-600/35 bg-violet-100 text-violet-950 dark:border-violet-400/35 dark:bg-violet-500/20 dark:text-violet-50"
                  >
                    Coming soon
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Add an image or clip you saved from a suspect listing. MarkIt searches for embedded markers and
                microdot-style signals, connects any hits to traces you have on file, and gives you clear language to
                support a DMCA notice.
              </p>
            </div>
          </div>
        </div>

        {blocked ? (
          <div className="mb-4 space-y-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-foreground">
              <Lock className="h-4 w-4 shrink-0 text-violet-700 dark:text-violet-300" aria-hidden />
              <span className="font-medium">Upload and analyze are not available in this workspace yet.</span>
            </div>
            <p className="text-muted-foreground">
              {MARKIT_EXTERNAL_TRACE_LINK_ENABLED ? (
                <>
                  Until it ships here, you can open MarkIt’s hosted trace tool and run the same trace-based check. When
                  analysis is enabled in this workspace, your evidence steps stay the same.
                </>
              ) : (
                <>
                  Hosted tracing is not linked from this screen in this release. When upload and analysis are enabled
                  here, your evidence steps stay the same.
                </>
              )}
            </p>
            {MARKIT_EXTERNAL_TRACE_LINK_ENABLED ? (
              <a
                href={MARKIT_EXTERNAL_TRACE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-violet-800 underline decoration-violet-600/40 underline-offset-2 hover:text-violet-950 dark:text-violet-300 dark:hover:text-violet-200"
              >
                Open hosted trace on MarkIt
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : (
              <span className="text-[13px] font-medium text-muted-foreground">
                Hosted trace link is turned off in this release.
              </span>
            )}
            <div className="flex flex-wrap items-center gap-3 border-t border-border/50 pt-3">
              <span className="text-xs font-medium tracking-tight text-muted-foreground">
                Estimated in-dashboard availability
              </span>
              <div
                className="flex flex-wrap gap-2 font-mono text-sm tabular-nums text-foreground"
                aria-live="polite"
              >
                {(() => {
                  const d = parts.d
                  const weeks = Math.floor(d / 7)
                  const daysRem = d % 7
                  const chip = 'rounded-md border border-border/60 bg-background/60 px-2 py-1'
                  if (d === 7) {
                    return <span className={chip}>7d</span>
                  }
                  if (d > 7) {
                    return (
                      <>
                        <span className={chip}>{weeks}w</span>
                        {daysRem > 0 ? <span className={chip}>{daysRem}d</span> : null}
                      </>
                    )
                  }
                  return <span className={chip}>{d}d</span>
                })()}
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

        <div
          className={cn(
            'flex flex-col gap-3 sm:flex-row sm:items-end',
            blocked && 'rounded-lg border border-border bg-muted/40 p-3 dark:bg-muted/25',
          )}
        >
          <div className={cn('flex min-w-0 flex-1 flex-col gap-1.5', blocked && 'cursor-not-allowed')}>
            <span className="text-xs font-semibold text-foreground">Suspect file</span>
            {blocked ? (
              <>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  In-app upload is not finished yet — this row previews where you will attach evidence after MarkIt
                  ships here.
                </p>
                <div
                  role="status"
                  aria-label="File upload not available yet"
                  className="flex min-h-10 items-center gap-2 rounded-md border border-dashed border-muted-foreground/40 bg-background px-3 py-2.5 text-sm text-foreground shadow-sm"
                >
                  <Upload className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="text-muted-foreground">Choose file — coming soon</span>
                </div>
              </>
            ) : (
              <label className="flex cursor-pointer flex-col gap-1.5 text-xs text-muted-foreground">
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null)
                    setResult(null)
                    setErr(null)
                  }}
                />
              </label>
            )}
          </div>
          {blocked ? (
            MARKIT_EXTERNAL_TRACE_LINK_ENABLED ? (
              <Button asChild variant="outline" className="shrink-0 gap-2 border-violet-600/40 text-foreground hover:bg-muted">
                <a href={MARKIT_EXTERNAL_TRACE_URL} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  Test it out
                </a>
              </Button>
            ) : (
              <span
                role="status"
                className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-md border border-dashed border-muted-foreground/50 bg-background px-3 py-2 text-center text-xs font-medium leading-snug text-foreground sm:max-w-[12rem] sm:self-end"
                title="Hosted MarkIt lab is not linked from this screen in this release."
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                Coming soon
              </span>
            )
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
