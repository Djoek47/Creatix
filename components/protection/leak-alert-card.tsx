'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import {
  ExternalLink,
  Loader2,
  ScanSearch,
  ChevronDown,
  Check,
  X,
  Undo2,
  RefreshCw,
  Info,
} from 'lucide-react'
import type { LeakAttributionApiResponse } from '@/lib/ariadne/attribution-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { CREDIT_USD_VALUE, CREDITS_LEAK_PAGE_VERIFY_ESTIMATE } from '@/lib/billing/credit-economics'
import type { LeakAlert, LeakDetectionStatus, LeakDistributionIntent, LeakSeverity, LeakUserCaseStatus } from '@/lib/types'
import { LEAK_OUTCOME_OPTIONS } from '@/lib/leaks/leak-detection-status'
import type { LeakNotesMeta } from '@/lib/leaks/leak-notes-meta'
import { formatNotesLine } from '@/lib/leaks/leak-notes-meta'
import { HostReportDestinationUI } from '@/components/protection/host-report-destinations-ui'
import { IntegrationCountdownPills } from '@/components/protection/integration-countdown-pills'
import { LeakAlertFlowStrip } from '@/components/protection/leak-alert-flow-strip'
import { markLeakLinkOpened, readLeakLinkOpenedIds } from '@/lib/leaks/leak-alert-flow'
import {
  humanizeLeakStatus,
  isOpenTriageStatus,
  leakContentKindLabel,
  leakMatchQuerySignal,
} from '@/lib/leaks/leak-alert-surface'

const PAGE_VERIFY_CREDITS_ESTIMATE = CREDITS_LEAK_PAGE_VERIFY_ESTIMATE
const PAGE_VERIFY_USD_ESTIMATE = (PAGE_VERIFY_CREDITS_ESTIMATE * CREDIT_USD_VALUE).toFixed(2)

const REVIEW_SUMMARY: Record<string, string> = {
  likely_infringing: 'Likely match',
  non_conclusive: 'Inconclusive',
  non_conclusive_needs_access: 'Needs sign-in',
}

const ACCESS_HINT: Record<string, string> = {
  public_snippet: 'Public preview',
  likely_paywall_or_sign_in: 'May need sign-in',
  unknown: 'Access unclear',
}

const CASE_LABELS: { value: LeakUserCaseStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'unresolved', label: 'Unresolved' },
  { value: 'needs_help', label: 'Needs help' },
  { value: 'snoozed', label: 'Snoozed' },
  { value: 'waived', label: 'Waived' },
]

const DIST_OPTIONS: { value: LeakDistributionIntent; label: string }[] = [
  { value: 'unspecified', label: 'Not specified' },
  { value: 'paid_only_elsewhere', label: 'Exclusive elsewhere' },
  { value: 'ok_if_free', label: 'OK when I choose free' },
  { value: 'cross_post_consented', label: 'Cross-post / consent nuance' },
]

function outcomeOptionsFor(alert: LeakAlert) {
  const cur = alert.status as LeakDetectionStatus
  const base = LEAK_OUTCOME_OPTIONS
  if (base.some((o) => o.value === cur)) return base
  return [
    {
      value: cur,
      label: String(cur).replace(/_/g, ' '),
      hint: 'Current value',
    },
    ...base,
  ]
}

function defaultSnoozeIso(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString()
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}

const SWIPE_PX = 88

function openLinkGravityForSeverity(severity: LeakSeverity | undefined): { dur: number; nudge: string } {
  switch (severity ?? 'medium') {
    case 'critical':
      return { dur: 2.05, nudge: '1.65px' }
    case 'high':
      return { dur: 2.5, nudge: '1.35px' }
    case 'medium':
      return { dur: 3.05, nudge: '1.1px' }
    case 'low':
    default:
      return { dur: 3.85, nudge: '0.85px' }
  }
}

/** Prominent leak URL CTA — matches severity urgency (parity with triage swipe + Re-verify styling). */
function openLinkHeroCtaClasses(severity: LeakSeverity | undefined, visited: boolean): string {
  if (visited) {
    return cn(
      'border border-border/50 bg-muted/[0.32] text-foreground/88 shadow-sm backdrop-blur-sm',
      'hover:bg-muted/[0.45] hover:border-border/60 hover:text-foreground',
    )
  }
  switch (severity ?? 'medium') {
    case 'critical':
      return cn(
        'border border-red-500/55 bg-gradient-to-b from-red-500/[0.22] via-red-600/[0.13] to-red-950/50 text-white shadow-[0_8px_36px_-10px_rgba(239,68,68,0.55)]',
        'hover:from-red-500/[0.3] hover:via-red-600/[0.18] hover:to-red-950/55 hover:border-red-400/65',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )
    case 'high':
      return cn(
        'border border-orange-500/50 bg-gradient-to-b from-orange-500/[0.22] via-orange-600/[0.12] to-orange-950/45 text-orange-50',
        'shadow-[0_8px_32px_-10px_rgba(249,115,22,0.48)]',
        'hover:from-orange-500/[0.29] hover:via-orange-600/[0.18] hover:border-orange-400/62',
        'focus-visible:ring-2 focus-visible:ring-orange-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )
    case 'medium':
      return cn(
        'border border-amber-500/45 bg-gradient-to-b from-amber-500/[0.16] via-amber-600/[0.08] to-amber-950/40 text-amber-50',
        'shadow-[0_6px_28px_-10px_rgba(234,179,8,0.35)]',
        'hover:from-amber-500/[0.24] hover:border-amber-400/55',
        'focus-visible:ring-2 focus-visible:ring-amber-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )
    case 'low':
    default:
      return cn(
        'border border-sky-500/45 bg-gradient-to-b from-sky-500/[0.15] via-sky-600/[0.08] to-sky-950/35 text-sky-50',
        'shadow-[0_6px_28px_-10px_rgba(14,165,233,0.32)]',
        'hover:from-sky-500/[0.22] hover:border-sky-400/55',
        'focus-visible:ring-2 focus-visible:ring-sky-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )
  }
}

export function LeakAlertCard(props: {
  alert: LeakAlert
  meta: LeakNotesMeta
  isPro: boolean
  verifying: boolean
  tracing: boolean
  attribution?: LeakAttributionApiResponse
  attributionError?: string | null
  /** Pinned “confirmed” lane: compact, no swipe; undo / not mine only. */
  presentation?: 'default' | 'confirmedLane'
  onPatch: (alertId: string, body: Record<string, unknown>) => Promise<void> | void
  onVerify: (alertId: string) => Promise<void>
  onTrace: (alert: LeakAlert) => Promise<void>
  onDmca: (alert: LeakAlert) => void
}) {
  const {
    alert,
    meta,
    isPro,
    verifying,
    tracing,
    attribution,
    attributionError,
    presentation = 'default',
    onPatch,
    onVerify,
    onTrace,
    onDmca,
  } = props

  const pinned = presentation === 'confirmedLane'

  const openTriage = isOpenTriageStatus(alert.status as string)
  const matchSignal = useMemo(() => leakMatchQuerySignal(alert), [alert])

  const nuanceShort = meta.distributionNuance || alert.ai_nuance_summary || ''
  const caseStatus = (alert.user_case_status as LeakUserCaseStatus | undefined) || 'open'
  const distIntent = (alert.creator_distribution_intent as LeakDistributionIntent | undefined) || 'unspecified'

  const [dragDx, setDragDx] = useState(0)
  const [linkVisited, setLinkVisited] = useState(false)
  const dragging = useRef(false)
  const startRef = useRef({ x: 0, pid: -1 })
  const swipeSurfaceRef = useRef<HTMLDivElement>(null)

  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

  useEffect(() => {
    setLinkVisited(readLeakLinkOpenedIds().has(alert.id))
  }, [alert.id])

  const onLeakLinkActivated = useCallback(() => {
    markLeakLinkOpened(alert.id)
    setLinkVisited(true)
  }, [alert.id])

  const onLeakLinkAuxNavigate = useCallback(
    (e: ReactMouseEvent<HTMLAnchorElement>) => {
      if (e.button === 1 || e.ctrlKey || e.metaKey) onLeakLinkActivated()
    },
    [onLeakLinkActivated],
  )

  const commitSwipeLeft = useCallback(() => void onPatch(alert.id, { status: 'false_positive' }), [alert.id, onPatch])
  const commitSwipeRight = useCallback(() => void onPatch(alert.id, { status: 'confirmed' }), [alert.id, onPatch])
  const commitUndoConfirm = useCallback(() => void onPatch(alert.id, { status: 'reviewing' }), [alert.id, onPatch])

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    if (e.button !== 0) return
    dragging.current = true
    startRef.current = { x: e.clientX, pid: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    if (!dragging.current || startRef.current.pid !== e.pointerId) return
    setDragDx(Math.max(-140, Math.min(140, e.clientX - startRef.current.x)))
  }, [])

  const resetDrag = useCallback(() => {
    dragging.current = false
    setDragDx(0)
  }, [])

  const onPointerEnd = useCallback(
    (e: ReactPointerEvent) => {
      if (startRef.current.pid !== e.pointerId) return
      dragging.current = false
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // ignore
      }
      const dx = e.clientX - startRef.current.x
      setDragDx(0)
      if (reduceMotion) return
      if (dx > SWIPE_PX) void commitSwipeRight()
      else if (dx < -SWIPE_PX) void commitSwipeLeft()
    },
    [commitSwipeLeft, commitSwipeRight, reduceMotion],
  )

  const severityBar =
    alert.severity === 'critical'
      ? 'bg-red-500/90'
      : alert.severity === 'high'
        ? 'bg-orange-400/85'
        : alert.severity === 'medium'
          ? 'bg-amber-400/85'
          : 'bg-sky-500/80'

  const leakPageHost = useMemo(() => {
    try {
      return new URL(alert.source_url).hostname.replace(/^www\./, '')
    } catch {
      return 'External page'
    }
  }, [alert.source_url])

  const openLinkGravity = useMemo(() => openLinkGravityForSeverity(alert.severity), [alert.severity])

  const openLinkMotionStyle =
    linkVisited || reduceMotion
      ? undefined
      : ({
          ['--leak-nudge' as string]: openLinkGravity.nudge,
          animation: `leak-open-link-gravity ${openLinkGravity.dur}s ease-in-out infinite`,
        } as CSSProperties)

  return (
    <div
      className={cn(
        'backdrop-blur-[1px]',
        pinned
          ? cn(
              'leak-confirmed-pin-shell rounded-[1.0625rem] border border-white/[0.14]',
              'bg-gradient-to-b from-secondary/45 to-secondary/[0.06] dark:from-secondary/30 dark:to-secondary/[0.04]',
              'p-[1.375rem]',
            )
          : cn(
              'rounded-[1.25rem] border border-white/[0.07] bg-gradient-to-b from-secondary/35 to-secondary/15 p-6 shadow-sm',
              'motion-safe:transition-[box-shadow] motion-safe:duration-300 hover:shadow-md dark:from-secondary/25 dark:to-secondary/10',
            ),
      )}
    >
      <div
        ref={swipeSurfaceRef}
        role="group"
        tabIndex={0}
        aria-label={
          pinned
            ? 'Leak confirmed — return to review or dismiss if incorrect.'
            : 'Leak detection — swipe left to dismiss as not yours, swipe right to confirm your content.'
        }
        className="-mx-1 touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onPointerDown={pinned ? undefined : onPointerDown}
        onPointerMove={pinned ? undefined : onPointerMove}
        onPointerUp={pinned ? undefined : onPointerEnd}
        onPointerCancel={pinned ? undefined : resetDrag}
        style={
          pinned || reduceMotion
            ? undefined
            : { transform: `translateX(${dragDx}px) rotate(${dragDx * 0.02}deg)` }
        }
      >
        <div className={cn('flex', pinned ? 'gap-3' : 'gap-4')}>
          <div className={cn('hidden shrink-0 rounded-full self-stretch sm:block', pinned ? 'w-[2px]' : 'w-[3px]', severityBar)} aria-hidden />
          <div className={cn('mb-px shrink-0 rounded-full self-start sm:hidden', pinned ? 'h-9 w-[2px]' : 'h-10 w-[3px]', severityBar)} aria-hidden />

          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-3 sm:gap-y-2">
            <span className="text-[13px] font-semibold capitalize tracking-tight text-foreground">
              {alert.severity ?? 'signal'}
            </span>
            <div className="hidden h-3 w-px bg-border/35 sm:block" aria-hidden />

            {meta.urgency === 'immediate' ? (
              <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-destructive/90">Immediate</span>
            ) : meta.urgency ? (
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/85">
                {meta.urgency}
              </span>
            ) : null}
            <span className="text-[13px] text-muted-foreground/85">{alert.source_platform}</span>
            {(alert.reappearance_count ?? 0) > 0 ? (
              <span className="text-[11px] tabular-nums text-muted-foreground">Returned ×{alert.reappearance_count}</span>
            ) : null}
          </div>
        </div>

        <div className={cn('min-w-0', pinned ? 'mt-4' : 'mt-5')}>
          <a
            href={alert.source_url}
            target="_blank"
            rel="noreferrer"
            onMouseDown={onLeakLinkAuxNavigate}
            onClick={onLeakLinkActivated}
            className={cn(
              'font-medium leading-snug tracking-tight text-foreground underline decoration-border/55 decoration-1 underline-offset-[5px] transition hover:decoration-foreground/35',
              pinned ? 'text-[15px]' : 'text-[17px]',
            )}
          >
            {alert.source_url}
          </a>
          {nuanceShort ? (
            <p className="mt-3 max-w-[52rem] text-[14px] leading-relaxed text-muted-foreground/90">{nuanceShort}</p>
          ) : null}
          {alert.notes ? (
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground/75 line-clamp-2">{formatNotesLine(alert.notes)}</p>
          ) : null}
        </div>

        {/* Substance-first signals: inferred media + discovery query — not the empty pipe word “detected”. */}
        <div className={cn('flex flex-wrap gap-2', pinned ? 'mt-3' : 'mt-4')}>
          <Badge
            variant="secondary"
            title="Inferred from AI triage, snippets, or URL cues — verify on the live page."
            className="rounded-md px-2 py-0.5 text-[11px] font-medium tracking-tight text-foreground/90"
          >
            {leakContentKindLabel(alert.media_type)}
          </Badge>
          {matchSignal ? (
            <Badge
              variant="outline"
              title={matchSignal.title ?? matchSignal.label}
              className={cn(
                'max-w-[min(100%,24rem)] rounded-md border-white/14 px-2 py-0.5 text-[11px] font-normal text-foreground/90',
                'truncate',
              )}
            >
              {matchSignal.label}
            </Badge>
          ) : null}
          {!openTriage ? (
            <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
              {humanizeLeakStatus(String(alert.status))}
            </Badge>
          ) : null}
          {meta.reviewConclusion ? (
            <Badge variant="outline" className="rounded-md border-white/15 px-2 py-0.5 text-[11px] font-normal">
              {REVIEW_SUMMARY[meta.reviewConclusion] || meta.reviewConclusion}
            </Badge>
          ) : null}
          {meta.evidenceAccessibility && meta.evidenceAccessibility !== 'public_snippet' ? (
            <Badge variant="outline" className="rounded-md border-amber-500/35 px-2 py-0.5 text-[11px] text-amber-200/95">
              {ACCESS_HINT[meta.evidenceAccessibility] || meta.evidenceAccessibility}
            </Badge>
          ) : null}
        </div>

        {/* Primary action strip: triage swipe OR confirmed pin controls */}
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-3 border-t border-border/30',
            pinned ? 'mt-5 pt-5' : 'mt-8 pt-6',
          )}
        >
          {pinned ? (
            <>
              <p className="max-w-[20rem] text-[11px] leading-snug text-muted-foreground/80">
                Confirmed as your content. Undo to re-triage or dismiss if mistaken.
              </p>
              <div className="flex w-full min-w-[min(100%,26rem)] flex-wrap justify-end gap-2 sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 flex-1 rounded-full border-border/55 px-4 text-[13px] font-medium tracking-tight sm:max-w-[12rem]"
                  onClick={() => void commitUndoConfirm()}
                >
                  <Undo2 className="mr-2 h-[16px] w-[16px] opacity-85" aria-hidden />
                  Undo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-10 flex-1 rounded-full px-4 text-[13px] font-medium tracking-tight sm:max-w-[12rem]',
                    'motion-safe:active:scale-[0.98]',
                  )}
                  onClick={() => void commitSwipeLeft()}
                >
                  <X className="mr-2 h-[16px] w-[16px] opacity-80" aria-hidden />
                  Not mine
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[11px] leading-relaxed text-muted-foreground/70">
                Swipe card or use buttons.<span className="sr-only"> Left: not yours. Right: confirms your content leaked.</span>
              </p>
              <div className="flex w-full gap-3 sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'h-12 flex-1 rounded-full border-border/55 font-medium tracking-tight sm:min-w-[9.5rem]',
                    'motion-safe:active:scale-[0.98]',
                  )}
                  onClick={() => void commitSwipeLeft()}
                >
                  <X className="mr-2 h-[18px] w-[18px] opacity-80" aria-hidden />
                  Not mine
                </Button>
                <Button
                  type="button"
                  className={cn(
                    'h-12 flex-1 rounded-full bg-foreground text-background hover:bg-foreground/90',
                    'font-medium tracking-tight shadow-sm sm:min-w-[9.5rem] motion-safe:active:scale-[0.98]',
                  )}
                  onClick={() => void commitSwipeRight()}
                >
                  <Check className="mr-2 h-[18px] w-[18px] opacity-90" aria-hidden />
                  Confirm match
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Secondary: classification — single disclosure */}
      <details
        className={cn(
          'group rounded-2xl border border-border/30 bg-black/[0.12] [&_summary::-webkit-details-marker]:hidden dark:bg-white/[0.03]',
          pinned ? 'mt-4' : 'mt-6',
        )}
      >
        <summary
          className={cn(
            'flex cursor-pointer items-center gap-3 px-5 text-left text-[14px] font-medium text-foreground',
            pinned ? 'py-3' : 'py-4',
          )}
        >
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-safe:duration-200" />
          Adjust classification & case
          <span className="sr-only">Expand to change detection outcome, case status, and distribution intent.</span>
        </summary>
        <div className={cn('space-y-6 border-t border-border/25 px-5 pb-5', pinned ? 'pt-4' : 'pt-6')}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[12px] text-muted-foreground">Detection outcome</Label>
              <Select
                value={alert.status}
                onValueChange={(v) => void onPatch(alert.id, { status: v as LeakDetectionStatus })}
              >
                <SelectTrigger className="h-11 rounded-xl border-border/40 bg-background/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[min(320px,70vh)]">
                  {outcomeOptionsFor(alert).map((o) => (
                    <SelectItem key={o.value} value={o.value} title={o.hint}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[12px] text-muted-foreground">Case status</Label>
              <Select
                value={caseStatus}
                onValueChange={(v) => {
                  const next = v as LeakUserCaseStatus
                  const body: Record<string, unknown> = { user_case_status: next }
                  if (next === 'snoozed') body.snooze_until = alert.snooze_until || defaultSnoozeIso()
                  void onPatch(alert.id, body)
                }}
              >
                <SelectTrigger className="h-11 rounded-xl border-border/40 bg-background/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>{CASE_LABELS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {caseStatus === 'snoozed' ? (
            <div className="space-y-2">
              <Label className="text-[12px] text-muted-foreground">Snooze until (local)</Label>
              <Input
                type="datetime-local"
                className="h-11 rounded-xl bg-background/40 text-[13px]"
                defaultValue={toDatetimeLocalValue(alert.snooze_until)}
                key={`${alert.id}-${alert.snooze_until ?? 'none'}`}
                onBlur={(e) => {
                  const v = e.target.value
                  if (!v) return
                  void onPatch(alert.id, { user_case_status: 'snoozed', snooze_until: new Date(v).toISOString() })
                }}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label className="text-[12px] text-muted-foreground">Distribution intent</Label>
            <Select
              value={distIntent}
              onValueChange={(v) => void onPatch(alert.id, { creator_distribution_intent: v as LeakDistributionIntent })}
            >
              <SelectTrigger className="h-11 max-w-full rounded-xl border-border/40 bg-background/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>{DIST_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>
        </div>
      </details>

      {(meta.distributionNuance || meta.suggestedUserAction || meta.rationale) && (
        <details className="group mt-3 rounded-2xl border border-border/30 bg-black/[0.08] [&_summary::-webkit-details-marker]:hidden dark:bg-white/[0.02]">
          <summary className="flex cursor-pointer items-center gap-3 px-5 py-3.5 text-[13px] text-muted-foreground">
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
            AI triage detail
          </summary>
          <div className="space-y-3 border-t border-border/20 px-5 pb-5 pt-4 text-[12px] leading-relaxed text-muted-foreground">
            {meta.rationale ? <p><span className="font-medium text-foreground/90">Rationale · </span>{meta.rationale}</p> : null}
            <p className="text-[11px] italic opacity-75">Signals use public snippets—not legal advice. You verify before notices.</p>
          </div>
        </details>
      )}

      <div className={cn('space-y-5 border-t border-border/25', pinned ? 'mt-4 pt-4' : 'mt-6 pt-5')}>
        <LeakAlertFlowStrip alert={alert} linkOpened={linkVisited} />

        <a
          href={alert.source_url}
          target="_blank"
          rel="noreferrer"
          onMouseDown={onLeakLinkAuxNavigate}
          onClick={onLeakLinkActivated}
          aria-label={
            linkVisited
              ? `Open ${leakPageHost} again in a new tab — already marked as opened in leak flow`
              : `Open leaked page on ${leakPageHost} in a new tab — ${String(alert.severity ?? 'medium')} severity`
          }
          className={cn(
            'group relative flex w-full min-w-0 items-center gap-3.5 rounded-2xl border px-4 py-4 text-left sm:gap-5 sm:px-6 sm:py-4',
            'backdrop-blur-[1px] transition-[transform,background-color,border-color,box-shadow] duration-200',
            'motion-safe:active:scale-[0.992]',
            openLinkHeroCtaClasses(alert.severity, linkVisited),
          )}
        >
          <span
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-[0.8125rem] border shadow-inner backdrop-blur-sm',
              linkVisited
                ? 'border-border/55 bg-muted/45 text-muted-foreground'
                : alert.severity === 'critical'
                  ? 'border-white/[0.2] bg-black/25 text-white'
                  : alert.severity === 'high'
                    ? 'border-orange-400/25 bg-black/[0.22] text-orange-50'
                    : alert.severity === 'medium'
                      ? 'border-amber-300/[0.22] bg-black/[0.18] text-amber-50'
                      : 'border-sky-300/[0.22] bg-black/[0.18] text-sky-50',
            )}
            aria-hidden
          >
            {linkVisited ? <Check className="h-6 w-6" strokeWidth={2.25} aria-hidden /> : <ExternalLink className="h-6 w-6 shrink-0" aria-hidden />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold leading-tight tracking-tight sm:text-[14px]">
              {linkVisited ? 'Leak page opened' : 'Open leaked page'}
            </span>
            <span className="mt-1 block truncate text-[12px] font-medium opacity-90">{leakPageHost}</span>
            {!linkVisited ? (
              <span className="mt-2 inline-flex text-[11px] font-semibold uppercase tracking-[0.12em] opacity-85 sm:hidden">
                Opens new tab · external
              </span>
            ) : null}
          </span>
          {!linkVisited ? (
            <span className="hidden shrink-0 sm:inline-flex rounded-full border border-white/[0.12] bg-black/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-current opacity-[0.9]">
              External · new tab
            </span>
          ) : null}
        </a>

        <div className="flex flex-wrap gap-2">
          <HostReportDestinationUI sourceUrl={alert.source_url} notes={alert.notes ?? null} variant="inline" />
        {isPro && alert.severity === 'critical' ? (
          <div className="flex flex-wrap items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                'h-10 rounded-xl px-4 text-[13px] font-semibold tracking-tight',
                'border-amber-500/55 bg-gradient-to-b from-amber-500/[0.1] to-amber-500/[0.02] text-foreground shadow-sm',
                'hover:from-amber-500/[0.16] hover:to-amber-500/[0.05] hover:border-amber-400/70',
                'focus-visible:ring-2 focus-visible:ring-amber-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                verifying ? 'opacity-90' : 'leak-reverify-cta',
              )}
              disabled={verifying}
              onClick={() => void onVerify(alert.id)}
              aria-label="Re-verify: fetch live page excerpt and second-pass model check."
            >
              {verifying ? (
                <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4 shrink-0 opacity-95" aria-hidden />
              )}
              Re-verify page
              <span
                className="ml-2 inline-flex items-center rounded-md border border-amber-500/35 bg-black/25 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground"
                title={`Estimated workload ${PAGE_VERIFY_CREDITS_ESTIMATE} credits (${PAGE_VERIFY_USD_ESTIMATE} USD); not billed today.`}
              >
                ~{PAGE_VERIFY_CREDITS_ESTIMATE}c
              </span>
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:bg-muted/55 hover:text-foreground"
                  aria-label="About re-verify page and credit estimate"
                >
                  <Info className="h-4 w-4 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[min(calc(100vw-2rem),20rem)] space-y-3 border-border/60 p-4 text-[13px] shadow-lg"
              >
                <div className="space-y-2">
                  <p className="font-semibold leading-snug text-foreground">Second pass • page verify</p>
                  <p className="leading-relaxed text-muted-foreground">
                    The first signal uses snippets only. Re-verify retrieves public page text when the host responds, then
                    runs a tighter check against your connected handles and recent titles—so you are not drafting on vague
                    search blurbs alone.
                  </p>
                </div>
                <div className="rounded-lg border border-border/45 bg-muted/25 px-3 py-2.5 text-[12px] leading-snug text-muted-foreground">
                  <span className="font-medium text-foreground/95">Workload equivalent:</span>{' '}
                  <span className="tabular-nums font-medium text-foreground">{PAGE_VERIFY_CREDITS_ESTIMATE}</span> credits
                  (~USD {PAGE_VERIFY_USD_ESTIMATE} at ${CREDIT_USD_VALUE}/credit).{' '}
                  <span className="font-medium text-foreground">Not debited</span> from your AI balance today. Venus Pro is
                  required to run this pass.
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ) : null}
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:max-w-none sm:flex-row sm:items-center sm:gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 shrink-0 rounded-xl px-4 text-[13px]"
            disabled={tracing}
            title="Runs a sample attribution check on this URL. Deeper in-dashboard trace UX ships on the same window as MarkIt integration."
            onClick={() => void onTrace(alert)}
          >
            {tracing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanSearch className="mr-2 h-4 w-4 opacity-80" />}
            Trace to original recipient
          </Button>
          <div className="flex flex-wrap items-center gap-2 sm:border-l sm:border-border/40 sm:pl-3">
            <Badge
              variant="secondary"
              className="h-6 border-amber-500/35 bg-amber-500/10 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100/90"
            >
              Soon
            </Badge>
            <IntegrationCountdownPills />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="ml-auto h-10 rounded-xl bg-primary px-5 text-[13px] font-medium text-primary-foreground shadow-none"
          onClick={() => onDmca(alert)}
        >
          DMCA bundle
        </Button>
      </div>
      </div>

      {attributionError ? (
        <p className="mt-3 text-[12px] text-destructive">{attributionError}</p>
      ) : null}
      {attribution ? (
        <div className="mt-4 rounded-2xl border border-border/25 bg-muted/[0.20] px-4 py-3 text-[12px] text-muted-foreground">
          <p className="font-medium text-foreground">Attribution snapshot</p>
          <ul className="mt-2 list-inside list-disc space-y-0.5 leading-relaxed">
            <li>{attribution.is_markit ? 'Markit fingerprint signal present.' : 'No strong watermark on sampled bytes.'}</li>
            <li>Confidence: {String(attribution.confidence)} · credits {String(attribution.creditsCharged)}</li>
          </ul>
        </div>
      ) : null}
    </div>
  )
}
