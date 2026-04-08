import Link from 'next/link'
import { CheckCircle2, ExternalLink, FileWarning, Gavel, Link2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DmcaClaim, LeakAlert } from '@/lib/types'

type Props = {
  resolvedLeaks: LeakAlert[]
  dmcaClaims: DmcaClaim[]
}

function leakStatusStyle(status: string): string {
  switch (status) {
    case 'resolved':
      return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
    case 'false_positive':
      return 'border-slate-500/40 bg-slate-500/10 text-slate-300'
    case 'scam':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-300'
    case 'dmca_sent':
      return 'border-sky-500/35 bg-sky-500/10 text-sky-300'
    case 'ignored':
      return 'border-muted-foreground/30 bg-muted/40 text-muted-foreground'
    default:
      return 'border-border bg-muted/30 text-muted-foreground'
  }
}

function dmcaStatusStyle(status: string): string {
  switch (status) {
    case 'removed':
      return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
    case 'sent':
      return 'border-sky-500/35 bg-sky-500/10 text-sky-300'
    case 'acknowledged':
      return 'border-violet-500/35 bg-violet-500/10 text-violet-300'
    case 'draft':
      return 'border-muted-foreground/30 bg-muted/50 text-muted-foreground'
    case 'rejected':
      return 'border-red-500/35 bg-red-500/10 text-red-300'
    case 'appealed':
      return 'border-orange-500/35 bg-orange-500/10 text-orange-300'
    default:
      return 'border-border bg-muted/30 text-muted-foreground'
  }
}

function formatDmcaLabel(status: string): string {
  return status.replace(/_/g, ' ')
}

export function ProtectionResolvedArchive({ resolvedLeaks, dmcaClaims }: Props) {
  const leakCount = resolvedLeaks.length
  const dmcaCount = dmcaClaims.length
  const empty = leakCount === 0 && dmcaCount === 0

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <CheckCircle2 className="h-5 w-5 text-emerald-400/90" />
            Resolved archive
          </h2>
          <p className="text-sm text-muted-foreground">
            Closed leak cases and your full DMCA log—everything you have already triaged or filed stays here for audit
            and peace of mind.
          </p>
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span className="rounded-md border border-border bg-card/50 px-2 py-1">
            {leakCount} leak{leakCount === 1 ? '' : 's'}
          </span>
          <span className="rounded-md border border-border bg-card/50 px-2 py-1">
            {dmcaCount} DMCA{dmcaCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/40 p-4 shadow-inner backdrop-blur-sm sm:p-6">
        {empty ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/5 p-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-500/70" />
            </div>
            <div className="max-w-md space-y-1">
              <p className="font-medium text-foreground">Nothing archived yet</p>
              <p className="text-sm text-muted-foreground">
                When you mark a detection as resolved, scam, or false positive—or send a DMCA—it will appear here
                automatically.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Link2 className="h-4 w-4 text-violet-400" />
                Leak cases (closed)
              </div>
              {leakCount === 0 ? (
                <p className="text-sm text-muted-foreground">No closed leak rows yet.</p>
              ) : (
                <ul className="space-y-4">
                  {resolvedLeaks.map((alert) => {
                    const when = alert.resolved_at || alert.detected_at
                    return (
                      <li
                        key={alert.id}
                        className="group relative rounded-xl border border-border/60 bg-gradient-to-br from-background/80 to-muted/20 p-4 transition hover:border-violet-500/25"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={cn('text-[10px] capitalize', leakStatusStyle(alert.status))}>
                            {alert.status.replace(/_/g, ' ')}
                          </Badge>
                          {alert.severity ? (
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {alert.severity}
                            </Badge>
                          ) : null}
                          <span className="text-[11px] text-muted-foreground">
                            {when ? new Date(when).toLocaleString() : ''}
                          </span>
                        </div>
                        <p className="mt-2 break-all text-sm text-foreground/90">{alert.source_url}</p>
                        {alert.source_platform ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">{alert.source_platform}</p>
                        ) : null}
                        <a
                          href={alert.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-violet-400 hover:text-violet-300"
                        >
                          Open URL
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Gavel className="h-4 w-4 text-amber-400/90" />
                DMCA &amp; takedown log
              </div>
              {dmcaCount === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No claims stored yet. Use <span className="font-medium text-foreground">Download DMCA</span> on an active
                  alert to generate a draft.
                </p>
              ) : (
                <ul className="space-y-4">
                  {dmcaClaims.map((claim) => {
                    const when = claim.sent_at || claim.created_at
                    return (
                      <li
                        key={claim.id}
                        className="rounded-xl border border-border/60 bg-gradient-to-br from-background/80 to-muted/20 p-4 transition hover:border-amber-500/20"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={cn('text-[10px] capitalize', dmcaStatusStyle(claim.status))}>
                            {formatDmcaLabel(claim.status)}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {claim.platform}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {when ? new Date(when).toLocaleString() : ''}
                          </span>
                        </div>
                        <p className="mt-2 break-all text-sm text-foreground/90">{claim.infringing_url}</p>
                        {claim.response_notes ? (
                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{claim.response_notes}</p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {claim.status !== 'draft' ? (
                            <Link
                              href={`/api/dmca/claim/${claim.id}/download`}
                              className="inline-flex items-center gap-1 rounded-md border border-border bg-background/50 px-2 py-1 text-xs font-medium text-foreground hover:bg-muted/50"
                            >
                              <FileWarning className="h-3.5 w-3.5" />
                              Download notice
                            </Link>
                          ) : null}
                          <a
                            href={claim.infringing_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-violet-400 hover:text-violet-300"
                          >
                            Infringing URL
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
