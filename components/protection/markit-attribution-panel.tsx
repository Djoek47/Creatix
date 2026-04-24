'use client'

import { useState } from 'react'
import { Fingerprint, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MarkitAttributionResult } from '@/lib/ariadne/attribution-types'

type AnalyzeResponse = MarkitAttributionResult & { creditsCharged?: number; error?: string }

type Props = {
  className?: string
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

  const run = async () => {
    if (!file) return
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
      <div className="mb-3 flex items-start gap-3">
        <div className="rounded-xl bg-violet-500/15 p-2.5 ring-1 ring-violet-500/25">
          <Fingerprint className="h-5 w-5 text-violet-300" />
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight">MarkIt &amp; Ariadne attribution</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a re-uploaded image or video from a leak site. We scan for in-file forensic markers and microdot
            patterns to tie the sample to your traces — then you can use it as evidence in a DMCA draft.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 cursor-pointer flex-col gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium">Suspect file</span>
          <input
            type="file"
            accept="image/*,video/*"
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              setResult(null)
              setErr(null)
            }}
          />
        </label>
        <Button type="button" disabled={!file || busy} onClick={() => void run()} className="shrink-0 gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? 'Analyzing…' : 'Analyze sample'}
        </Button>
      </div>
      {err ? <p className="mt-3 text-sm text-destructive">{err}</p> : null}
      {result ? (
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
  )
}
