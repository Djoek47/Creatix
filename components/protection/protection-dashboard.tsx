'use client'

import { useEffect, useMemo, useState, useCallback, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { LeakAlert, LeakDetectionStatus, LeakDistributionIntent, LeakUserCaseStatus } from '@/lib/types'
import { LEAK_OUTCOME_OPTIONS } from '@/lib/leaks/leak-detection-status'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  ExternalLink,
  Upload,
  FileText,
  ChevronDown,
  Filter,
  RotateCcw,
  Copy,
  Mail,
  ScanSearch,
  Coins,
} from 'lucide-react'
import { getHostReportDestinations } from '@/lib/dmca/host-report-destinations'
import type { LeakAttributionApiResponse, MarkitAttributionResult } from '@/lib/ariadne/attribution-types'
import { cn } from '@/lib/utils'
import { useScanIdentity } from '@/hooks/use-scan-identity'
import { ScanHandlePicker } from '@/components/dashboard/scan-handle-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { isPaidPlanId } from '@/lib/billing/access'
import { CREDITS_LEAK_SCAN } from '@/lib/billing/credit-economics'
import { InsufficientCreditsCallout } from '@/components/billing/insufficient-credits-callout'
import { useCreditSnapshot } from '@/hooks/use-credit-snapshot'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { LeakMediaType, LeakSeverity } from '@/lib/types'
import { ProtectionModeToggle } from '@/components/protection/protection-mode-toggle'
import { ProtectionEasyHandles } from '@/components/protection/protection-easy-handles'

type Props = {
  activeAlerts: LeakAlert[]
  /** Pre-filled from profile; user can edit before scanning */
  suggestedAlias?: string | null
}

const PROTECTION_UI_MODE_KEY = 'protection_ui_mode'

function parseAliases(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.replace(/^@/, '').trim())
    .filter(Boolean)
}

function parseTitleHints(raw: string): string[] {
  return raw
    .split(/[\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseLeakMeta(notes: string | null): {
  urgency?: string
  rationale?: string
  pageVerified?: boolean
  evidenceAccessibility?: string
  reviewConclusion?: string
  distributionNuance?: string
  suggestedUserAction?: string
  contactHint?: string
  contactUrl?: string
  contactEmail?: string
} {
  try {
    const j = JSON.parse(notes || '{}') as {
      grok?: {
        urgency?: string
        rationale?: string
        evidenceAccessibility?: string
        reviewConclusion?: string
        distributionNuance?: string
        suggestedUserAction?: string
        contactHint?: string
        contactUrl?: string
        contactEmail?: string
      }
      pageVerify?: { verifiedLikelyMatch?: boolean }
    }
    const g = j.grok
    return {
      urgency: g?.urgency,
      rationale: g?.rationale,
      pageVerified: j.pageVerify?.verifiedLikelyMatch,
      evidenceAccessibility: g?.evidenceAccessibility,
      reviewConclusion: g?.reviewConclusion,
      distributionNuance: g?.distributionNuance,
      suggestedUserAction: g?.suggestedUserAction,
      contactHint: g?.contactHint,
      contactUrl: g?.contactUrl,
      contactEmail: g?.contactEmail,
    }
  } catch {
    return {}
  }
}

const REVIEW_BADGE: Record<string, string> = {
  likely_infringing: 'Likely infringing',
  non_conclusive: 'Non-conclusive',
  non_conclusive_needs_access: 'Needs sign-in to verify',
}

const ACCESS_BADGE: Record<string, string> = {
  public_snippet: 'Public snippet',
  likely_paywall_or_sign_in: 'Paywall / sign-in likely',
  unknown: 'Unknown access',
}

const SUGGESTED_ACTION_LABEL: Record<string, string> = {
  review_when_signed_in: 'Review when signed in',
  dmca_if_confirmed_match: 'DMCA if you confirm a match',
  monitor: 'Monitor',
  ignore_if_intentionally_public: 'OK if intentionally public',
}

const CASE_STATUS_OPTIONS: { value: LeakUserCaseStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'contacted', label: 'Contacted platform' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'unresolved', label: 'Unresolved' },
  { value: 'needs_help', label: 'Needs more help' },
  { value: 'snoozed', label: 'Snoozed' },
  { value: 'waived', label: 'Not pursuing (waived)' },
]

const DISTRIBUTION_OPTIONS: { value: LeakDistributionIntent; label: string }[] = [
  { value: 'unspecified', label: 'Not specified' },
  { value: 'paid_only_elsewhere', label: 'Paid / exclusive elsewhere' },
  { value: 'ok_if_free', label: 'OK if free everywhere I choose' },
  { value: 'cross_post_consented', label: 'Cross-post / consent nuance' },
]

function HostReportDestinationUI({
  sourceUrl,
  notes,
  variant,
}: {
  sourceUrl: string
  notes: string | null
  variant: 'inline' | 'panel'
}): ReactNode {
  const { links, hintText } = useMemo(
    () => getHostReportDestinations(sourceUrl, notes),
    [sourceUrl, notes],
  )
  const hasOnlyGuidance = useMemo(
    () => links.length > 0 && links.every((l) => l.source === 'guidance'),
    [links],
  )
  const [copied, setCopied] = useState(false)

  const copyHint = useCallback(() => {
    if (!hintText) return
    void navigator.clipboard.writeText(hintText).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    })
  }, [hintText])

  if (links.length === 0 && !hintText) return null

  const linkButtons = links.map((link, idx) =>
    link.kind === 'url' ? (
      <Button key={`url-${idx}-${link.href}`} asChild variant="outline" size="sm">
        <a href={link.href} target="_blank" rel="noreferrer">
          <ExternalLink className="mr-2 h-4 w-4" />
          {link.label}
        </a>
      </Button>
    ) : (
      <Button key={`mailto-${idx}-${link.href}`} asChild variant="outline" size="sm">
        <a href={link.href}>
          <Mail className="mr-2 h-4 w-4" />
          {link.label}
        </a>
      </Button>
    ),
  )

  const hintBlock =
    hintText != null && hintText.length > 0 ? (
      <div
        className={cn(
          'flex items-start gap-2',
          variant === 'inline' ? 'w-full basis-full text-[10px]' : 'text-xs',
        )}
      >
        <p className="min-w-0 flex-1 break-words text-muted-foreground">{hintText}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={copyHint}
          title={copied ? 'Copied' : 'Copy hint'}
          aria-label={copied ? 'Copied' : 'Copy where-to-report hint'}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    ) : null

  if (variant === 'panel') {
    return (
      <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3">
        <div>
          <p className="text-xs font-medium text-foreground">Where to send your notice</p>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
            {hasOnlyGuidance ? (
              <>
                We don&apos;t have a verified DMCA or abuse URL for this host from the scan. Use Google to find the
                site&apos;s legal or abuse contact, or a third-party takedown service. Re-verify page only checks whether
                the page likely matches your content—it does not discover WHOIS or contact forms. Creatix does not file
                with third parties (not legal advice).
              </>
            ) : (
              <>
                Links open public copyright or abuse pages when we know them. You pick the right channel and submit
                yourself—Creatix does not file with third parties (not legal advice).
              </>
            )}
          </p>
        </div>
        {linkButtons.length > 0 ? <div className="flex flex-wrap gap-2">{linkButtons}</div> : null}
        {hintBlock}
      </div>
    )
  }

  return (
    <>
      {linkButtons}
      {hintBlock}
    </>
  )
}

function defaultSnoozeIso(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString()
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function detectionOutcomeOptionsFor(alert: LeakAlert) {
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

function formatNotesLine(notes: string | null): string {
  const m = parseLeakMeta(notes)
  const parts: string[] = []
  if (m.urgency) parts.push(`Urgency: ${m.urgency}`)
  if (m.rationale) parts.push(m.rationale)
  if (m.pageVerified != null) parts.push(`Page verify: ${m.pageVerified ? 'likely match' : 'unclear'}`)
  if (parts.length) return parts.join(' · ')
  try {
    const j = JSON.parse(notes || '{}') as { title?: string; snippet?: string }
    return [j.title, j.snippet].filter(Boolean).join(' · ').slice(0, 280)
  } catch {
    return notes?.slice(0, 200) || ''
  }
}

function urgencyRank(u: string | undefined): number {
  if (u === 'immediate') return 0
  if (u === 'soon') return 1
  if (u === 'backlog') return 2
  return 3
}

const ALL_SEVERITIES: LeakSeverity[] = ['critical', 'high', 'medium', 'low']

/** Pills in the filter queue when that severity is included */
const SEVERITY_FILTER_ON: Record<LeakSeverity, string> = {
  critical:
    'border-red-500/60 bg-gradient-to-b from-red-950/50 to-red-950/20 text-red-100 shadow-[0_0_20px_-4px_rgba(239,68,68,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-red-400/30',
  high:
    'border-orange-500/55 bg-gradient-to-b from-orange-950/45 to-orange-950/15 text-orange-100 shadow-[0_0_18px_-4px_rgba(249,115,22,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-orange-400/30',
  medium:
    'border-amber-500/50 bg-gradient-to-b from-amber-950/35 to-amber-950/10 text-amber-100 shadow-[0_0_16px_-4px_rgba(234,179,8,0.4),inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-amber-400/25',
  low:
    'border-sky-500/50 bg-gradient-to-b from-sky-950/40 to-sky-950/10 text-sky-100 shadow-[0_0_16px_-4px_rgba(14,165,233,0.45),inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-sky-400/30',
}

const SEVERITY_FILTER_OFF =
  'border-border/50 bg-background/20 text-muted-foreground hover:border-border hover:bg-muted/30 hover:text-foreground'

function severityRank(s: string | undefined): number {
  if (s === 'critical') return 0
  if (s === 'high') return 1
  if (s === 'medium') return 2
  if (s === 'low') return 3
  return 4
}

export function ProtectionDashboard({ activeAlerts, suggestedAlias }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  const [scanLoading, setScanLoading] = useState(false)
  const [aliasInput, setAliasInput] = useState(() => suggestedAlias?.trim() ?? '')
  const [formerInput, setFormerInput] = useState('')
  const [titleHintsInput, setTitleHintsInput] = useState('')
  const [includeContentTitles, setIncludeContentTitles] = useState(true)
  const [strictScan, setStrictScan] = useState(true)
  const [scanSummary, setScanSummary] = useState<string | null>(null)
  const { wallet: creditWallet, loading: creditsWalletLoading, error: creditsLoadError, refresh: refreshLeakScanCredits } =
    useCreditSnapshot()
  const [saveIdentityLoading, setSaveIdentityLoading] = useState(false)
  const [manualUrl, setManualUrl] = useState('')
  const [manualLoading, setManualLoading] = useState(false)

  const [dmcaOpen, setDmcaOpen] = useState(false)
  const [dmcaLoading, setDmcaLoading] = useState(false)
  const [claimId, setClaimId] = useState<string | null>(null)
  const [noticeText, setNoticeText] = useState<string>('')
  const [selectedAlert, setSelectedAlert] = useState<LeakAlert | null>(null)
  const [proofUploading, setProofUploading] = useState(false)
  const [proofPaths, setProofPaths] = useState<string[]>([])
  const [isPro, setIsPro] = useState(false)
  const [alertUpdateError, setAlertUpdateError] = useState<string | null>(null)
  const [aegisEnabled, setAegisEnabled] = useState<boolean | null>(null)
  const [aegisLastRun, setAegisLastRun] = useState<string | null>(null)

  const { handles: identityHandles, contentTitles } = useScanIdentity()
  const [uiMode, setUiMode] = useState<'easy' | 'pro'>('easy')
  const [useAllLeakHandles, setUseAllLeakHandles] = useState(true)
  const [selectedLeakHandles, setSelectedLeakHandles] = useState<Set<string>>(new Set())
  const [focusContentId, setFocusContentId] = useState<string>('')
  const [focusTitleFilter, setFocusTitleFilter] = useState('')
  const leakHandlesInit = useRef(false)
  const urlFiltersSynced = useRef(false)

  /** Rookie default: focus on worst leaks first (toggle “All severities” to expand). */
  const [severityFilters, setSeverityFilters] = useState<Set<LeakSeverity>>(
    () => new Set<LeakSeverity>(['critical', 'high']),
  )
  const [mediaFilter, setMediaFilter] = useState<'all' | LeakMediaType>('all')
  const [filterText, setFilterText] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [verifyLoadingId, setVerifyLoadingId] = useState<string | null>(null)
  const [traceLoadingId, setTraceLoadingId] = useState<string | null>(null)
  const [attributionByAlertId, setAttributionByAlertId] = useState<
    Record<string, LeakAttributionApiResponse>
  >({})
  const [attributionErrorByAlertId, setAttributionErrorByAlertId] = useState<Record<string, string>>({})

  useEffect(() => {
    if (urlFiltersSynced.current) return
    const sev = searchParams.get('severity')
    const m = searchParams.get('media')
    if (!sev && !m) return
    if (sev) {
      const parts = sev.split(',').filter((p): p is LeakSeverity =>
        ALL_SEVERITIES.includes(p as LeakSeverity),
      )
      if (parts.length > 0) setSeverityFilters(new Set(parts))
    }
    if (m === 'video' || m === 'photo' || m === 'unknown') setMediaFilter(m)
    urlFiltersSynced.current = true
  }, [searchParams])


  const displayHandles = useMemo(() => {
    const aliases = parseAliases(aliasInput)
    const extras = aliases.filter(
      (a) => !identityHandles.some((h) => h.value.toLowerCase() === a.toLowerCase()),
    )
    const extraRows = extras.map((a) => ({
      value: a,
      source: 'alias_extra',
      label: `Extra alias @${a}`,
    }))
    return [...identityHandles, ...extraRows]
  }, [identityHandles, aliasInput])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const v = window.localStorage.getItem(PROTECTION_UI_MODE_KEY)
    if (v === 'pro') setUiMode('pro')
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (leakHandlesInit.current) return
    leakHandlesInit.current = true
    try {
      const raw = window.localStorage.getItem('protection_selected_handles')
      if (!raw) return
      const parsed = JSON.parse(raw) as string[]
      if (!Array.isArray(parsed)) return
      const allowed = new Set(identityHandles.map((h) => h.value))
      setSelectedLeakHandles(new Set(parsed.filter((h) => allowed.has(h))))
    } catch {
      // ignore malformed storage
    }
  }, [identityHandles])

  useEffect(() => {
    if (uiMode === 'easy') {
      setUseAllLeakHandles(true)
    }
  }, [uiMode])

  useEffect(() => {
    if (!identityHandles.length) return
    if (useAllLeakHandles) {
      setSelectedLeakHandles(new Set(identityHandles.map((h) => h.value)))
      return
    }
    setSelectedLeakHandles((prev) => {
      const allowed = new Set(identityHandles.map((h) => h.value))
      return new Set(Array.from(prev).filter((h) => allowed.has(h)))
    })
  }, [identityHandles, useAllLeakHandles])

  const persistUiMode = useCallback((mode: 'easy' | 'pro') => {
    setUiMode(mode)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PROTECTION_UI_MODE_KEY, mode)
    }
  }, [])

  const handleToggleLeakHandle = useCallback((value: string) => {
    setSelectedLeakHandles((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('protection_selected_handles', JSON.stringify(Array.from(next)))
      }
      return next
    })
  }, [])

  const handleUseAllLeakHandlesChange = useCallback((enabled: boolean) => {
    setUseAllLeakHandles(enabled)
  }, [])

  const handleSelectAllLeakHandles = useCallback(() => {
    const all = displayHandles.map((h) => h.value)
    setSelectedLeakHandles(new Set(all))
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('protection_selected_handles', JSON.stringify(all))
    }
  }, [displayHandles])

  const handleClearLeakHandles = useCallback(() => {
    setSelectedLeakHandles(new Set())
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('protection_selected_handles', JSON.stringify([]))
    }
  }, [])

  const severityColors: Record<string, string> = {
    critical: 'bg-destructive/20 text-destructive border-destructive/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  }

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('subscriptions')
          .select('plan_id')
          .eq('user_id', user.id)
          .maybeSingle()
        const planId = (data as { plan_id?: string } | null)?.plan_id
        if (planId && isPaidPlanId(planId)) {
          setIsPro(true)
        }
      } catch {
        // ignore subscription loading errors
      }
    }
    loadSubscription()
  }, [supabase])

  useEffect(() => {
    const loadAegis = async () => {
      try {
        const res = await fetch('/api/circe-aegis/settings')
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return
        const s = data.settings as { enabled?: boolean; last_leak_scan_at?: string | null }
        setAegisEnabled(Boolean(s?.enabled))
        setAegisLastRun(typeof s?.last_leak_scan_at === 'string' ? s.last_leak_scan_at : null)
      } catch {
        // table or route may be unavailable until migration
      }
    }
    void loadAegis()
  }, [])

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('profiles')
          .select('former_usernames, leak_search_title_hints')
          .eq('id', user.id)
          .maybeSingle()
        const row = data as {
          former_usernames?: string[] | null
          leak_search_title_hints?: string[] | null
        } | null
        if (row?.former_usernames?.length) {
          setFormerInput(row.former_usernames.join(', '))
        }
        if (row?.leak_search_title_hints?.length) {
          setTitleHintsInput(row.leak_search_title_hints.join('\n'))
        }
      } catch {
        // ignore
      }
    }
    loadProfile()
  }, [supabase])

  const saveSearchIdentity = useCallback(async () => {
    setSaveIdentityLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      await supabase
        .from('profiles')
        .update({
          former_usernames: parseAliases(formerInput),
          leak_search_title_hints: parseTitleHints(titleHintsInput),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
    } finally {
      setSaveIdentityLoading(false)
    }
  }, [supabase, formerInput, titleHintsInput])

  const sortedAlerts = useMemo(() => {
    return [...activeAlerts].sort((a, b) => {
      const sr = severityRank(a.severity) - severityRank(b.severity)
      if (sr !== 0) return sr
      const ua = parseLeakMeta(a.notes).urgency
      const ub = parseLeakMeta(b.notes).urgency
      return urgencyRank(ua) - urgencyRank(ub)
    })
  }, [activeAlerts])

  const filteredAlerts = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    return sortedAlerts.filter((alert) => {
      const sev = (alert.severity || 'medium') as LeakSeverity
      if (!severityFilters.has(sev)) return false
      const mt = (alert.media_type || 'unknown') as LeakMediaType
      if (mediaFilter !== 'all' && mt !== mediaFilter) return false
      if (!q) return true
      const hay = `${alert.source_url} ${alert.ai_nuance_summary || ''} ${formatNotesLine(alert.notes)}`.toLowerCase()
      return hay.includes(q)
    })
  }, [sortedAlerts, severityFilters, mediaFilter, filterText])

  const runLeakUrlAttribution = useCallback(
    async (alert: LeakAlert) => {
      setTraceLoadingId(alert.id)
      setAttributionErrorByAlertId((prev) => {
        const next = { ...prev }
        delete next[alert.id]
        return next
      })
      try {
        const res = await fetch(`/api/leaks/alerts/${alert.id}/attribution`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': crypto.randomUUID(),
          },
          body: JSON.stringify({}),
        })
        const data = (await res.json().catch(() => ({}))) as LeakAttributionApiResponse & { error?: string }
        if (!res.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : 'Attribution scan failed')
        }
        setAttributionByAlertId((prev) => ({ ...prev, [alert.id]: data }))
      } catch (e) {
        setAttributionErrorByAlertId((prev) => ({
          ...prev,
          [alert.id]: e instanceof Error ? e.message : 'Attribution scan failed',
        }))
      } finally {
        setTraceLoadingId(null)
      }
    },
    [],
  )

  const verifyLeakPage = useCallback(
    async (alertId: string) => {
      setVerifyLoadingId(alertId)
      setAlertUpdateError(null)
      try {
        const res = await fetch(`/api/leaks/alerts/${alertId}/verify`, { method: 'POST' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Page verify failed')
        router.refresh()
      } catch (e) {
        setAlertUpdateError(e instanceof Error ? e.message : 'Page verify failed')
      } finally {
        setVerifyLoadingId(null)
      }
    },
    [router],
  )

  const patchLeakAlert = useCallback(
    async (alertId: string, body: Record<string, unknown>) => {
      setAlertUpdateError(null)
      const res = await fetch(`/api/leaks/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAlertUpdateError(typeof data.error === 'string' ? data.error : 'Could not update alert.')
        return
      }
      router.refresh()
    },
    [router],
  )

  const creditsRemaining = creditWallet?.totalRemaining
  const leakScanCostLabel = `${CREDITS_LEAK_SCAN} credit${CREDITS_LEAK_SCAN === 1 ? '' : 's'}`
  const leakScanBlockedByBalance = typeof creditsRemaining === 'number' && creditsRemaining < CREDITS_LEAK_SCAN

  const runScan = async () => {
    setScanLoading(true)
    setScanSummary(null)
    try {
      const isEasy = uiMode === 'easy'
      if (isEasy) {
        if (identityHandles.length === 0) {
          setScanSummary('Connect at least one account in Integrations, then run Easy scan.')
          return
        }
      } else if (selectedLeakHandles.size === 0) {
        setScanSummary('Select at least one identity before running Protection scan.')
        return
      }

      const focusHandlesPayload = isEasy
        ? identityHandles.map((h) => h.value)
        : Array.from(selectedLeakHandles)

      const focusTitlesPayload = parseTitleHints(focusTitleFilter)
      const body: Record<string, unknown> = isEasy
        ? {
            aliases: [],
            former_usernames: [],
            title_hints: [],
            include_content_titles: false,
            strict: true,
            focus_handles: focusHandlesPayload,
          }
        : {
            aliases: parseAliases(aliasInput),
            former_usernames: parseAliases(formerInput),
            title_hints: parseTitleHints(titleHintsInput),
            include_content_titles: includeContentTitles,
            strict: strictScan,
            focus_handles: focusHandlesPayload,
          }

      if (!isEasy) {
        if (focusContentId) {
          body.content_ids = [focusContentId]
        }
        if (focusTitlesPayload.length) {
          body.focus_title_hints = focusTitlesPayload
        }
      }

      const res = await fetch('/api/leaks/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await res.json().catch(() => ({}))) as {
        inserted?: number
        skipped?: number
        filteredStrict?: number
        pageVerifyCount?: number
        message?: string
        error?: string
      }
      if (res.ok) {
        setScanSummary(
          `Added ${data.inserted ?? 0} new alert(s). Skipped duplicates: ${data.skipped ?? 0}.` +
            (typeof data.filteredStrict === 'number' ? ` Filtered by strict mode: ${data.filteredStrict}.` : '') +
            (typeof data.pageVerifyCount === 'number' && data.pageVerifyCount > 0
              ? ` Critical pages verified: ${data.pageVerifyCount}.`
              : '') +
            (data.message ? ` ${data.message}` : ''),
        )
      } else {
        const base = data.error || 'Scan failed.'
        setScanSummary(
          res.status === 402
            ? `${base} Open Billing to top up credits or upgrade your plan.`
            : base,
        )
      }
      void refreshLeakScanCredits()
      router.refresh()
    } finally {
      setScanLoading(false)
    }
  }

  const reportManual = async () => {
    const url = manualUrl.trim()
    if (!url) return
    setManualLoading(true)
    try {
      await fetch('/api/leaks/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: [url] }),
      })
      setManualUrl('')
      router.refresh()
    } finally {
      setManualLoading(false)
    }
  }

  const stripLeakAttributionForDmca = (r: LeakAttributionApiResponse): MarkitAttributionResult => {
    const { creditsCharged: _c, leak_alert_id: _l, fetched_url: _f, ...rest } = r
    return rest
  }

  const startDmcaFromAlert = async (alert: LeakAlert) => {
    setSelectedAlert(alert)
    setDmcaOpen(true)
    setDmcaLoading(true)
    setClaimId(null)
    setNoticeText('')
    setProofPaths([])
    try {
      const trace = attributionByAlertId[alert.id]
      const body: Record<string, unknown> = { leakAlertId: alert.id }
      if (trace) {
        body.ariadneAttributionEvidence = stripLeakAttributionForDmca(trace)
      }
      const res = await fetch('/api/dmca/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        setClaimId(data.claimId)
        setNoticeText(data.notice || '')
      }
    } finally {
      setDmcaLoading(false)
    }
  }

  const uploadProof = async (file: File) => {
    if (!claimId) return
    setProofUploading(true)
    try {
      const res = await fetch('/api/dmca/proof/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, filename: file.name, contentType: file.type }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to get upload URL')

      const { path, token } = data as { path: string; token: string; signedUrl: string }
      const { error } = await supabase.storage
        .from('dmca-proofs')
        .uploadToSignedUrl(path, token, file, { contentType: file.type || 'application/octet-stream' })
      if (error) throw new Error(error.message)

      // Attach proof path to claim
      await fetch(`/api/dmca/claim/${claimId}/proofs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proofPaths: [path] }),
      })
      setProofPaths((prev) => Array.from(new Set([...prev, path])))
    } finally {
      setProofUploading(false)
    }
  }

  const aegisStatusTitle =
    aegisEnabled === null
      ? 'Configure scheduled scans in the hub'
      : `Background scans ${aegisEnabled ? 'on' : 'off'}${
          aegisLastRun ? ` · Last run ${new Date(aegisLastRun).toLocaleString()}` : ''
        }`

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-1.5">
          <p className="text-base font-semibold tracking-tight text-foreground sm:text-[1.0625rem]">Scan setup</p>
          <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground/88">
            <span className="font-medium text-foreground/90">Easy</span> uses linked accounts only.{' '}
            <span className="font-medium text-foreground/90">Pro</span> adds per-handle control, saved aliases, stricter matching, and manual URLs.
          </p>
        </div>
        <ProtectionModeToggle value={uiMode} onChange={persistUiMode} className="shrink-0" />
      </div>

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border/45 pb-4 text-[13px] text-muted-foreground/85">
        <Link
          href="/dashboard/protection/aegis"
          className="font-medium text-foreground underline-offset-4 transition hover:underline"
          title={aegisStatusTitle}
        >
          Aegis
        </Link>
        <span className="text-border/60" aria-hidden>
          ·
        </span>
        <Link
          href="/dashboard/settings?tab=integrations"
          className="font-medium text-foreground underline-offset-4 transition hover:underline"
          title="Connect accounts so scans include linked usernames"
        >
          Integrations
        </Link>
      </p>

      {uiMode === 'pro' && displayHandles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/55 bg-muted/10 px-5 py-8 text-center dark:bg-muted/5">
          <p className="text-[15px] font-semibold tracking-tight text-foreground">No connected identities</p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-snug text-muted-foreground/85">
            Link a platform under Integrations to unlock per-handle control and run a Pro scan.
          </p>
          <Button asChild variant="outline" className="mt-5 h-10 rounded-xl px-5 text-[13px] font-medium">
            <Link href="/dashboard/settings?tab=integrations">Open Integrations</Link>
          </Button>
        </div>
      ) : null}

      {uiMode === 'easy' ? (
        <section className="space-y-3" aria-labelledby="scan-accounts-heading">
          <div>
            <h2 id="scan-accounts-heading" className="text-[15px] font-semibold tracking-tight text-foreground">
              Connected accounts
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground/85">
              The scan uses usernames from platforms you have linked—no extra configuration.
            </p>
          </div>
          <ProtectionEasyHandles handles={identityHandles} />
        </section>
      ) : null}

      {uiMode === 'pro' && displayHandles.length > 0 ? (
        <section className="space-y-3" aria-labelledby="scan-identities-heading">
          <div>
            <h2 id="scan-identities-heading" className="text-[15px] font-semibold tracking-tight text-foreground">
              Who to include
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground/85">
              Choose which handles participate in this run. Refinements below apply on top of this set.
            </p>
          </div>
          <ScanHandlePicker
            handles={displayHandles}
            useAll={useAllLeakHandles}
            onUseAllChange={handleUseAllLeakHandlesChange}
            selected={selectedLeakHandles}
            onToggle={handleToggleLeakHandle}
            idPrefix="leak-scan"
            className="rounded-2xl border-border/50 bg-muted/15 p-4 dark:bg-muted/10"
          />
        </section>
      ) : null}

      {uiMode === 'pro' ? (
        <section className="space-y-4 rounded-2xl border border-border/50 bg-muted/15 p-4 sm:p-5 dark:bg-muted/10" aria-labelledby="scan-behavior-heading">
          <div>
            <h2 id="scan-behavior-heading" className="text-[15px] font-semibold tracking-tight text-foreground">
              How this scan behaves
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground/85">
              Tune what goes into queries and how aggressively results are filtered.
            </p>
          </div>
          <div className="space-y-5">
            <div className="flex gap-3">
              <Checkbox
                id="include-content-titles"
                className="mt-0.5"
                checked={includeContentTitles}
                onCheckedChange={(v) => setIncludeContentTitles(v === true)}
              />
              <div className="min-w-0">
                <label htmlFor="include-content-titles" className="cursor-pointer text-[13px] font-medium text-foreground">
                  Include library titles
                </label>
                <p className="mt-1 text-[12px] leading-snug text-muted-foreground/85">
                  Merge published and scheduled titles from your content library into search queries (usage caps apply).
                </p>
              </div>
            </div>
            <div className="h-px bg-border/45" aria-hidden />
            <div className="flex gap-3">
              <Checkbox
                id="strict-scan"
                className="mt-0.5"
                checked={strictScan}
                onCheckedChange={(v) => setStrictScan(v === true)}
              />
              <div className="min-w-0">
                <label htmlFor="strict-scan" className="cursor-pointer text-[13px] font-medium text-foreground">
                  Strict matching
                </label>
                <p className="mt-1 text-[12px] leading-snug text-muted-foreground/85">
                  Drop likely false positives using AI on eligible plans, or keyword checks otherwise. URLs you paste manually are always kept.
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {uiMode === 'pro' ? (
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-start justify-between gap-3 rounded-2xl border border-border/50 bg-muted/10 px-4 py-3.5 text-left outline-none transition hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-muted/5 dark:hover:bg-muted/15"
            >
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold tracking-tight text-foreground">Advanced identity hints</span>
                <span className="mt-1 block text-[13px] font-normal leading-snug text-muted-foreground/85">
                  Extra aliases, former names, and title phrases—saved to your profile for future scans.
                </span>
              </span>
              <ChevronDown
                className={cn('mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', advancedOpen && 'rotate-180')}
                aria-hidden
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-5 data-[state=open]:pt-5">
            <div className="space-y-2">
              <Label htmlFor="alias-input" className="text-[13px] font-medium text-foreground/90">
                Extra names and handles
              </Label>
              <p className="text-[12px] leading-snug text-muted-foreground/85">Comma or new line. Searched in addition to connected platforms.</p>
              <Textarea
                id="alias-input"
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                placeholder="e.g. stage name, alternate @handles"
                className="min-h-[72px] rounded-xl text-[13px] md:text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="former-input" className="text-[13px] font-medium text-foreground/90">
                Former usernames
              </Label>
              <p className="text-[12px] leading-snug text-muted-foreground/85">Saved to your profile and included on every Pro scan until you remove them.</p>
              <Textarea
                id="former-input"
                value={formerInput}
                onChange={(e) => setFormerInput(e.target.value)}
                placeholder="Handles you used before a rebrand"
                className="min-h-[56px] rounded-xl text-[13px] md:text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title-hints" className="text-[13px] font-medium text-foreground/90">
                Title phrases
              </Label>
              <p className="text-[12px] leading-snug text-muted-foreground/85">One per line. Merged with library titles when “Include library titles” is on.</p>
              <Textarea
                id="title-hints"
                value={titleHintsInput}
                onChange={(e) => setTitleHintsInput(e.target.value)}
                placeholder="Exact or partial titles that may appear on leak pages"
                className="min-h-[72px] rounded-xl text-[13px] md:text-sm"
              />
            </div>

            <div className="flex flex-col gap-2 border-t border-border/45 pt-4 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-lg px-4"
                disabled={saveIdentityLoading}
                onClick={saveSearchIdentity}
              >
                {saveIdentityLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save to profile
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 rounded-lg px-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={saveIdentityLoading}
                onClick={async () => {
                  setSaveIdentityLoading(true)
                  try {
                    const {
                      data: { user },
                    } = await supabase.auth.getUser()
                    if (!user) return
                    await supabase
                      .from('profiles')
                      .update({
                        former_usernames: [],
                        leak_search_title_hints: [],
                        updated_at: new Date().toISOString(),
                      })
                      .eq('id', user.id)
                    setFormerInput('')
                    setTitleHintsInput('')
                    setAliasInput('')
                    if (typeof window !== 'undefined') {
                      window.localStorage.removeItem('protection_selected_handles')
                    }
                  } finally {
                    setSaveIdentityLoading(false)
                  }
                }}
              >
                Clear saved hints
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {uiMode === 'pro' ? (
        <section className="space-y-3" aria-labelledby="scan-narrow-heading">
          <div>
            <h2 id="scan-narrow-heading" className="text-[15px] font-semibold tracking-tight text-foreground">
              Narrow this run
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground/85">
              Optional. Focus on one library item or require specific phrases in merged titles.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-foreground/90">Library item focus</Label>
              <p className="text-[12px] leading-snug text-muted-foreground/85">Adds that item’s title into this scan’s queries.</p>
              <Select value={focusContentId || '__none__'} onValueChange={(v) => setFocusContentId(v === '__none__' ? '' : v)}>
                <SelectTrigger className="h-10 rounded-xl text-[13px] md:text-sm">
                  <SelectValue placeholder="All library titles (or pick one)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No single-item focus</SelectItem>
                  {contentTitles.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title.length > 64 ? `${c.title.slice(0, 64)}…` : c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="focus-title-filter" className="text-[13px] font-medium text-foreground/90">
                Title query filter
              </Label>
              <p className="text-[12px] leading-snug text-muted-foreground/85">One phrase per line. Each must appear in the merged title set.</p>
              <Textarea
                id="focus-title-filter"
                value={focusTitleFilter}
                onChange={(e) => setFocusTitleFilter(e.target.value)}
                placeholder="e.g. part of a video title"
                className="min-h-[88px] rounded-xl text-[13px] md:text-sm"
              />
            </div>
          </div>
        </section>
      ) : null}

      <div className="space-y-5 border-t border-border/45 pt-6 sm:pt-8">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <div
            className={cn(
              'inline-flex max-w-full items-center gap-2 rounded-xl border border-border/55 bg-muted/30 px-3 py-1.5 tabular-nums dark:bg-muted/20',
              leakScanBlockedByBalance && 'border-destructive/35 bg-destructive/8 text-destructive',
            )}
            title="AI credit wallet: included monthly pool plus any purchases."
          >
            <Coins className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            {creditsWalletLoading && !creditsLoadError ? (
              <span className="text-[13px] text-muted-foreground">Loading credits…</span>
            ) : creditsLoadError ? (
              <span className="text-[13px] text-destructive">{creditsLoadError}</span>
            ) : (
              <span className="text-[13px] text-muted-foreground/90">
                <span className="font-semibold text-foreground">
                  {typeof creditsRemaining === 'number' ? creditsRemaining.toLocaleString() : '—'}
                </span>
                <span> credits · </span>
                <span className="font-medium text-foreground/90">{leakScanCostLabel}</span>
                <span> per {uiMode === 'easy' ? 'scan' : 'Pro scan'}</span>
              </span>
            )}
          </div>
        </div>

        {leakScanBlockedByBalance ? (
          <InsufficientCreditsCallout
            requiredCredits={CREDITS_LEAK_SCAN}
            actionContext="a protection leak scan"
          />
        ) : null}

        <div
          className={cn(
            'flex flex-col gap-6',
            uiMode === 'pro' ? 'lg:flex-row lg:items-start lg:justify-between lg:gap-10' : '',
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Button
              className={cn(
                'h-11 gap-2 rounded-xl bg-foreground px-6 text-[15px] font-medium text-background shadow-sm transition-colors hover:bg-foreground/88 disabled:pointer-events-none disabled:opacity-35',
              )}
              onClick={runScan}
              disabled={
                scanLoading ||
                leakScanBlockedByBalance ||
                (uiMode === 'easy' ? identityHandles.length === 0 : selectedLeakHandles.size === 0)
              }
              title={
                leakScanBlockedByBalance
                  ? 'Add AI credits in Billing to run a leak scan.'
                  : `Debits ${leakScanCostLabel} from your balance.`
              }
            >
              {scanLoading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <ScanSearch className="h-4 w-4 shrink-0" aria-hidden />}
              {uiMode === 'easy' ? 'Run scan' : 'Run Pro scan'}
            </Button>
            {scanSummary ? (
              <p className="text-[13px] leading-relaxed text-muted-foreground/88 sm:max-w-xl">{scanSummary}</p>
            ) : null}
          </div>

          {uiMode === 'pro' ? (
            <div className="w-full shrink-0 space-y-2 rounded-2xl border border-border/50 bg-muted/10 p-4 dark:bg-muted/5 lg:max-w-[min(100%,20rem)]">
              <Label htmlFor="manual-url" className="text-[13px] font-medium text-foreground">
                Report a URL
              </Label>
              <p className="text-[12px] leading-snug text-muted-foreground/85">
                Submit one infringing link outside the automated scan.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  id="manual-url"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="Paste URL…"
                  className="h-10 rounded-xl text-[13px] md:text-sm"
                />
                <Button
                  variant="outline"
                  className="h-10 shrink-0 rounded-xl px-4"
                  onClick={reportManual}
                  disabled={manualLoading || !manualUrl.trim()}
                >
                  {manualLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Report
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Active Alerts list (actionable) */}
      {alertUpdateError ? (
        <p className="text-sm text-destructive" role="alert">
          {alertUpdateError}
        </p>
      ) : null}
      <div className="relative overflow-hidden rounded-xl border border-violet-500/15 bg-gradient-to-b from-muted/25 via-background/40 to-muted/10 p-3 shadow-sm ring-1 ring-inset ring-white/[0.04] space-y-3 transition-shadow duration-300 hover:shadow-md hover:ring-violet-500/20">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent motion-safe:animate-pulse motion-safe:[animation-duration:2.4s] motion-reduce:opacity-50"
          aria-hidden
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-500/10 text-violet-300">
            <Filter className="h-4 w-4 shrink-0" aria-hidden />
          </div>
          <span className="text-xs font-medium tracking-tight text-foreground">Filter queue</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/90">Severity</span>
          {ALL_SEVERITIES.map((s) => {
            const on = severityFilters.has(s)
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSeverityFilters((prev) => {
                    const next = new Set(prev)
                    if (next.has(s)) next.delete(s)
                    else next.add(s)
                    if (next.size === 0) next.add(s)
                    return next
                  })
                }}
                className={cn(
                  'h-7 min-w-[4.75rem] rounded-md border px-3 text-xs font-medium capitalize sm:min-w-0',
                  'transition-all duration-300 ease-out motion-safe:hover:scale-[1.02] active:scale-[0.98]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  on ? SEVERITY_FILTER_ON[s] : SEVERITY_FILTER_OFF,
                )}
              >
                {s}
              </button>
            )
          })}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setSeverityFilters(new Set(ALL_SEVERITIES))}
          >
            All
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-xs text-amber-200/80 hover:text-amber-100"
            onClick={() => setSeverityFilters(new Set(['critical', 'high']))}
          >
            <RotateCcw className="h-3 w-3 motion-safe:transition-transform motion-safe:duration-500 hover:rotate-[-25deg]" />
            Priority
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase text-muted-foreground">Media</span>
          <Select
            value={mediaFilter}
            onValueChange={(v) => setMediaFilter(v as 'all' | LeakMediaType)}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="photo">Photo</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="leak-filter-text" className="text-[10px] text-muted-foreground">
            Search URL / notes
          </Label>
          <Input
            id="leak-filter-text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter…"
            className="h-9 text-sm"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Showing{' '}
          <span className="tabular-nums font-medium text-foreground">{filteredAlerts.length}</span>
          {' of '}
          <span className="tabular-nums text-foreground/80">{sortedAlerts.length}</span>
          {' in the active queue.'}
        </p>
      </div>
      <div className="space-y-3">
        {filteredAlerts.map((alert) => {
          const meta = parseLeakMeta(alert.notes)
          const caseStatus = (alert.user_case_status as LeakUserCaseStatus | undefined) || 'open'
          const distIntent =
            (alert.creator_distribution_intent as LeakDistributionIntent | undefined) || 'unspecified'
          const urgencyClass =
            meta.urgency === 'immediate'
              ? 'border-destructive text-destructive'
              : meta.urgency === 'soon'
                ? 'border-orange-500 text-orange-400'
                : 'border-muted-foreground/50 text-muted-foreground'
          const nuanceText = meta.distributionNuance || alert.ai_nuance_summary || ''
          return (
            <div
              key={alert.id}
              className="flex flex-col gap-4 rounded-lg border border-border bg-secondary/30 p-4"
            >
              <div className="min-w-0 w-full space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs capitalize',
                      severityColors[alert.severity] || 'bg-muted text-muted-foreground',
                    )}
                  >
                    {alert.severity || 'unknown'}
                  </Badge>
                  {alert.media_type && alert.media_type !== 'unknown' ? (
                    <Badge variant="outline" className="text-xs capitalize border-primary/30">
                      {alert.media_type}
                    </Badge>
                  ) : null}
                  {(alert.reappearance_count ?? 0) > 0 ? (
                    <Badge variant="secondary" className="text-xs">
                      Resurfaced ×{alert.reappearance_count}
                    </Badge>
                  ) : null}
                  {meta.urgency ? (
                    <Badge variant="outline" className={cn('text-xs capitalize', urgencyClass)}>
                      {meta.urgency}
                    </Badge>
                  ) : null}
                  <Badge variant="outline" className="text-xs capitalize">
                    {alert.status.replace('_', ' ')}
                  </Badge>
                  {meta.reviewConclusion ? (
                    <Badge variant="secondary" className="text-xs">
                      {REVIEW_BADGE[meta.reviewConclusion] || meta.reviewConclusion}
                    </Badge>
                  ) : null}
                  {meta.evidenceAccessibility && meta.evidenceAccessibility !== 'public_snippet' ? (
                    <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-600 dark:text-amber-400">
                      {ACCESS_BADGE[meta.evidenceAccessibility] || meta.evidenceAccessibility}
                    </Badge>
                  ) : null}
                  <span className="text-xs text-muted-foreground">{alert.source_platform}</span>
                </div>
                <p className="block w-full max-w-full whitespace-normal text-sm break-words [overflow-wrap:anywhere]">
                  {alert.source_url}
                </p>
                {nuanceText ? (
                  <p className="text-xs text-muted-foreground line-clamp-4">{nuanceText}</p>
                ) : null}
                {alert.notes ? (
                  <div className="text-xs text-muted-foreground line-clamp-2">{formatNotesLine(alert.notes)}</div>
                ) : null}
                {(meta.distributionNuance || meta.suggestedUserAction || meta.rationale) && (
                  <details className="rounded-md border border-border bg-muted/20 p-2 text-xs">
                    <summary className="cursor-pointer font-medium text-foreground">AI triage detail</summary>
                    <div className="mt-2 space-y-2 text-muted-foreground">
                      {meta.suggestedUserAction ? (
                        <p>
                          <span className="font-medium text-foreground">Suggested action: </span>
                          {SUGGESTED_ACTION_LABEL[meta.suggestedUserAction] || meta.suggestedUserAction}
                        </p>
                      ) : null}
                      {meta.distributionNuance ? (
                        <p>
                          <span className="font-medium text-foreground">Distribution nuance: </span>
                          {meta.distributionNuance}
                        </p>
                      ) : null}
                      {meta.rationale ? (
                        <p>
                          <span className="font-medium text-foreground">Rationale: </span>
                          {meta.rationale}
                        </p>
                      ) : null}
                      <p className="text-[11px] italic">
                        AI uses search snippets only—not legal advice. You confirm before any DMCA.
                      </p>
                    </div>
                  </details>
                )}
                <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:items-end">
                  <div className="space-y-1 min-w-[220px] max-w-full">
                    <Label className="text-[10px] text-muted-foreground">Detection outcome</Label>
                    <Select
                      value={alert.status}
                      onValueChange={(v) => {
                        void patchLeakAlert(alert.id, { status: v as LeakDetectionStatus })
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Set outcome" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[min(320px,70vh)]">
                        {detectionOutcomeOptionsFor(alert).map((o) => (
                          <SelectItem key={o.value} value={o.value} className="text-xs" title={o.hint}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 min-w-[160px]">
                    <Label className="text-[10px] text-muted-foreground">Your case status</Label>
                    <Select
                      value={caseStatus}
                      onValueChange={(v) => {
                        const next = v as LeakUserCaseStatus
                        const payload: Record<string, unknown> = { user_case_status: next }
                        if (next === 'snoozed') {
                          payload.snooze_until = alert.snooze_until || defaultSnoozeIso()
                        }
                        void patchLeakAlert(alert.id, payload)
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CASE_STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {caseStatus === 'snoozed' ? (
                    <div className="space-y-1 min-w-[200px]">
                      <Label className="text-[10px] text-muted-foreground">Snooze until (local time)</Label>
                      <Input
                        type="datetime-local"
                        className="h-9 text-xs"
                        defaultValue={toDatetimeLocalValue(alert.snooze_until)}
                        key={`${alert.id}-${alert.snooze_until ?? 'none'}`}
                        onBlur={(e) => {
                          const v = e.target.value
                          if (!v) return
                          const iso = new Date(v).toISOString()
                          void patchLeakAlert(alert.id, { user_case_status: 'snoozed', snooze_until: iso })
                        }}
                      />
                    </div>
                  ) : null}
                  <div className="space-y-1 min-w-[180px]">
                    <Label className="text-[10px] text-muted-foreground">Your content intent</Label>
                    <Select
                      value={distIntent}
                      onValueChange={(v) => {
                        void patchLeakAlert(alert.id, {
                          creator_distribution_intent: v as LeakDistributionIntent,
                        })
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DISTRIBUTION_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex w-full min-w-0 flex-wrap gap-2 border-t border-border/60 pt-3 sm:pt-4">
                <Button asChild variant="outline" size="sm">
                  <a href={alert.source_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View
                  </a>
                </Button>
                <HostReportDestinationUI
                  sourceUrl={alert.source_url}
                  notes={alert.notes ?? null}
                  variant="inline"
                />
                {isPro && alert.severity === 'critical' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={verifyLoadingId === alert.id}
                    onClick={() => void verifyLeakPage(alert.id)}
                  >
                    {verifyLoadingId === alert.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Re-verify page
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={traceLoadingId === alert.id}
                  onClick={() => void runLeakUrlAttribution(alert)}
                >
                  {traceLoadingId === alert.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ScanSearch className="mr-2 h-4 w-4" />
                  )}
                  Trace to recipient
                </Button>
                <Button size="sm" onClick={() => void startDmcaFromAlert(alert)}>
                  Download DMCA
                </Button>
              </div>
              {attributionErrorByAlertId[alert.id] ? (
                <p className="text-xs text-destructive">{attributionErrorByAlertId[alert.id]}</p>
              ) : null}
              {attributionByAlertId[alert.id] ? (
                <div className="rounded-md border border-border/80 bg-muted/15 p-3 text-xs space-y-1.5">
                  <p className="font-medium text-foreground">Ariadne trace (leak URL)</p>
                  <p className="text-muted-foreground">
                    {attributionByAlertId[alert.id].is_markit
                      ? 'Possible Markit marker found.'
                      : 'No strong Markit marker on this sample (re-encoded video may hide microdots).'}
                  </p>
                  <ul className="list-inside list-disc text-muted-foreground space-y-0.5">
                    <li>Method: {attributionByAlertId[alert.id].detection_method}</li>
                    <li>Confidence: {attributionByAlertId[alert.id].confidence}</li>
                    {attributionByAlertId[alert.id].watermark_id ? (
                      <li>Payload id: {attributionByAlertId[alert.id].watermark_id}</li>
                    ) : null}
                    {attributionByAlertId[alert.id].user_id ? (
                      <li>Recipient id: {attributionByAlertId[alert.id].user_id}</li>
                    ) : null}
                    {attributionByAlertId[alert.id].evidence?.export?.id ? (
                      <li>Export: {attributionByAlertId[alert.id].evidence?.export?.id}</li>
                    ) : null}
                    <li>Credits: {attributionByAlertId[alert.id].creditsCharged}</li>
                  </ul>
                  {attributionByAlertId[alert.id].warnings?.length ? (
                    <p className="text-amber-600 dark:text-amber-400">
                      {attributionByAlertId[alert.id].warnings?.join(' ')}
                    </p>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground">
                    Open <span className="font-medium">Download DMCA</span> to merge this summary into your notice
                    description.
                  </p>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Circe does not log into paywalled or member-only pages. When a result looks like ads or sign-in walls, treat
        triage as non-conclusive until you can verify while signed in. DMCA notices are yours to send; this tool only
        helps draft and track.
      </p>

      {/* DMCA modal */}
      <Dialog open={dmcaOpen} onOpenChange={setDmcaOpen}>
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>DMCA Takedown Notice</DialogTitle>
            <DialogDescription>
              Review your DMCA draft for this leak. Attach proof files, then download the notice to send it to the host
              yourself—Creatix does not submit notices automatically.
            </DialogDescription>
            {selectedAlert && attributionByAlertId[selectedAlert.id] ? (
              <p className="text-xs text-muted-foreground pt-1">
                The description field in the notice below includes your last “Trace to recipient” summary for this
                leak row.
              </p>
            ) : null}
          </DialogHeader>

          {selectedAlert ? (
            <HostReportDestinationUI
              variant="panel"
              sourceUrl={selectedAlert.source_url}
              notes={selectedAlert.notes ?? null}
            />
          ) : null}

          {dmcaLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !claimId ? (
            <div className="text-sm text-muted-foreground">Unable to generate claim.</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs whitespace-pre-wrap">
                {noticeText || 'Notice generated.'}
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Proof of ownership (required)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) uploadProof(f)
                      e.currentTarget.value = ''
                    }}
                    disabled={proofUploading}
                  />
                  <Button variant="outline" disabled>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                </div>
                {proofPaths.length > 0 ? (
                  <div className="text-xs text-muted-foreground">
                    {proofPaths.length} proof file(s) attached.
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Upload at least 1 proof file before downloading.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  asChild
                  disabled={proofPaths.length === 0}
                >
                  <a href={`/api/dmca/claim/${claimId}/download`}>
                    <FileText className="mr-2 h-4 w-4" />
                    Download DMCA Notice
                  </a>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDmcaOpen(false)
                    setSelectedAlert(null)
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

