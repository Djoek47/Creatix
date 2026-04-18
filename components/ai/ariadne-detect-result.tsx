'use client'

import Link from 'next/link'
import { AlertTriangle, CheckCircle2, FileJson, Gavel, Info, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

type ReportVerified = {
  verdict: 'verified_account_match'
  headline: string
  recipientKey: string
  recipientKind?: string
  recipientLine?: string
  onlyFansFanId?: string | null
  fanUsernameOrDisplay?: string | null
  attributionLine?: string
  contentId?: string
  contentTitle?: string | null
  vaultItemLabel?: string
  embeddedAt?: string
  embeddedAtReadable?: string | null
  markerExpiresAt?: string | null
  markerExpiresReadable?: string | null
  exportId?: string
  payloadId?: string
  algorithmVersion?: string
  source?: string
}

type ReportOther = {
  verdict: 'no_marker' | 'unregistered'
  headline?: string
  summary?: string
}

export type AriadneDetectApiPayload = {
  match: boolean | string
  message?: string
  creditsCharged?: number
  dmcaHint?: string
  report?: (ReportVerified & Partial<ReportOther>) | ReportOther | null
  export?: Record<string, unknown>
  payload?: Record<string, unknown>
}

function isVerified(r: AriadneDetectApiPayload['report']): r is ReportVerified {
  return (r as ReportVerified | undefined)?.verdict === 'verified_account_match'
}

export function AriadneDetectResult({ data }: { data: AriadneDetectApiPayload | Record<string, unknown> }) {
  const d = data as AriadneDetectApiPayload
  const { report, creditsCharged, dmcaHint, export: exp, payload } = d

  return (
    <div className="space-y-4">
      {creditsCharged != null && (
        <p className="text-xs text-muted-foreground">Credits charged: {creditsCharged}</p>
      )}

      {d.match === false && report?.verdict === 'no_marker' && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">{report.headline ?? 'No marker'}</p>
              <p className="mt-1 text-sm text-muted-foreground">{report.summary}</p>
            </div>
          </div>
        </div>
      )}

      {d.match === 'unregistered' && (
        <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-4 dark:bg-amber-950/25">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-medium text-foreground">
                {(report as ReportOther)?.headline ?? 'Marker found — not on your account'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {(report as ReportOther)?.summary ??
                  d.message ??
                  'Decoded marker does not match an export in your Creatix workspace.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {d.match === true && report && isVerified(report) && (
        <div
          className={cn(
            'overflow-hidden rounded-xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-card to-card shadow-sm',
            'dark:border-emerald-500/30 dark:from-emerald-950/40',
          )}
        >
          <div className="border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-3 dark:bg-emerald-950/30">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200/90">
                  Verified match
                </p>
                <p className="text-lg font-semibold leading-snug text-foreground">{report.headline}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4 p-4">
            <div className="rounded-lg border border-border/80 bg-card/80 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Attributed recipient</p>
              <p className="mt-1 text-base font-semibold text-foreground">
                {report.attributionLine || report.recipientLine || report.recipientKey}
              </p>
              {report.fanUsernameOrDisplay && report.onlyFansFanId ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Chat handle:{' '}
                  <span className="font-medium text-foreground">@{report.fanUsernameOrDisplay}</span> · OnlyFans id{' '}
                  <code className="rounded bg-muted px-1 text-xs">{report.onlyFansFanId}</code>
                </p>
              ) : null}
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                Forensic key: <span className="text-foreground">{report.recipientKey}</span>
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-[11px] font-medium uppercase text-muted-foreground">Marker embedded (production)</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {report.embeddedAtReadable || report.embeddedAt || '—'}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">When this traced file was created in Creatix</p>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-[11px] font-medium uppercase text-muted-foreground">Marker validity</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {report.markerExpiresReadable || '—'}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">Signed payload expiry (cryptographic)</p>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-[11px] font-medium uppercase text-muted-foreground">Vault source</p>
              <p className="mt-1 font-medium text-foreground">{report.contentTitle || 'Untitled video'}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/dashboard/content-library">Open content library</Link>
                </Button>
                {report.onlyFansFanId ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/dashboard/messages?fanId=${encodeURIComponent(report.onlyFansFanId)}&platform=onlyfans`}
                    >
                      Open Messages (this fan)
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                <Gavel className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">DMCA & leak workflow</p>
                  <p className="text-xs text-muted-foreground">
                    {dmcaHint ||
                      'Use the recipient key and vault item in Protection: leak triage, Aegis, and DMCA drafts.'}
                  </p>
                </div>
              </div>
              <Button size="sm" className="shrink-0 gap-2" asChild>
                <Link href="/dashboard/protection">
                  <Shield className="h-4 w-4" />
                  Open Protection
                </Link>
              </Button>
            </div>

            <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Export id</dt>
                <dd className="font-mono text-[11px] text-foreground">{report.exportId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Payload id</dt>
                <dd className="font-mono text-[11px] text-foreground">{report.payloadId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Algorithm</dt>
                <dd>{report.algorithmVersion}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Source</dt>
                <dd>{report.source}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {(exp || payload) && (
        <Collapsible className="rounded-lg border border-border">
          <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-muted/50">
            <FileJson className="h-4 w-4" />
            Technical details (JSON)
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="max-h-56 overflow-auto border-t border-border bg-muted/20 p-3 text-[11px] leading-relaxed">
              {JSON.stringify({ export: exp, payload }, null, 2)}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
