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
  Shield,
  ChevronDown,
  Filter,
  RotateCcw,
  Copy,
  Mail,
} from 'lucide-react'
import { getHostReportDestinations } from '@/lib/dmca/host-report-destinations'
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { LeakMediaType, LeakSeverity } from '@/lib/types'

type Props = {
  activeAlerts: LeakAlert[]
  /** Pre-filled from profile; user can edit before scanning */
  suggestedAlias?: string | null
}

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
  const [useAllLeakHandles] = useState(false)
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

  const runScan = async () => {
    setScanLoading(true)
    setScanSummary(null)
    try {
      const aliases = parseAliases(aliasInput)
      if (selectedLeakHandles.size === 0) {
        setScanSummary('Select at least one identity before running Protection scan.')
        return
      }
      const focusHandlesPayload = Array.from(selectedLeakHandles)
      const focusTitlesPayload = parseTitleHints(focusTitleFilter)
      const body: Record<string, unknown> = {
        aliases,
        former_usernames: parseAliases(formerInput),
        title_hints: parseTitleHints(titleHintsInput),
        include_content_titles: includeContentTitles,
        strict: strictScan,
      }
      body.focus_handles = focusHandlesPayload
      if (focusContentId) {
        body.content_ids = [focusContentId]
      }
      if (focusTitlesPayload.length) {
        body.focus_title_hints = focusTitlesPayload
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
        setScanSummary(data.error || 'Scan failed.')
      }
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

  const startDmcaFromAlert = async (alert: LeakAlert) => {
    setSelectedAlert(alert)
    setDmcaOpen(true)
    setDmcaLoading(true)
    setClaimId(null)
    setNoticeText('')
    setProofPaths([])
    try {
      const res = await fetch('/api/dmca/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leakAlertId: alert.id }),
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

  return (
    <div className="space-y-4 min-w-0">
      <p className="text-xs text-muted-foreground">
        Automated search surfaces candidates for your review. Confirm each link before sending a DMCA notice.
      </p>

      <div className="flex flex-col gap-2 rounded-lg border border-primary/25 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Circe&apos;s Aegis</p>
            <p className="text-xs text-muted-foreground">
              {aegisEnabled === null
                ? 'Configure scheduled leak scans and optional DMCA drafts in the hub.'
                : `Background scans ${aegisEnabled ? 'on' : 'off'}`}
              {aegisEnabled !== null && aegisLastRun
                ? ` · Last scheduled run ${new Date(aegisLastRun).toLocaleString()}`
                : ''}
              {aegisEnabled === true && !aegisLastRun ? ' · No run logged yet' : ''}
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" className="shrink-0" asChild>
          <Link href="/dashboard/protection/aegis">Open Aegis hub</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Connect creator and social accounts under Integrations so scans include every OAuth username (X, IG, TikTok,
          OnlyFans, Fansly…).
        </p>
        <Button variant="outline" size="sm" className="shrink-0" asChild>
          <Link href="/dashboard/settings?tab=integrations">Open Integrations</Link>
        </Button>
      </div>

      <div className="rounded-lg border border-circe/30 bg-circe/5 p-3 text-sm">
        <p className="font-medium text-foreground">Start here</p>
        <p className="text-xs text-muted-foreground mt-1">
          Pick identities below, run <strong>Invoke Scan</strong> or paste a link, then use the filters to focus on the
          worst leaks first (defaults to <strong>critical</strong> and <strong>high</strong>).
        </p>
      </div>

      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" type="button" className="flex w-full items-center justify-between gap-2 text-sm">
            Advanced identity hints (extra aliases, saved former names, title phrases)
            <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', advancedOpen && 'rotate-180')} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 data-[state=open]:pt-3">
          <div className="space-y-2">
            <Label htmlFor="alias-input" className="text-xs text-muted-foreground">
              Extra names and handles (comma or line; searched in addition to connected platforms)
            </Label>
            <Textarea
              id="alias-input"
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              placeholder="e.g. stage name, alternate @handles"
              className="min-h-[72px] text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="former-input" className="text-xs text-muted-foreground">
              Former / old usernames (comma or line; saved to your profile for every scan)
            </Label>
            <Textarea
              id="former-input"
              value={formerInput}
              onChange={(e) => setFormerInput(e.target.value)}
              placeholder="Handles you used before a rebrand"
              className="min-h-[56px] text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title-hints" className="text-xs text-muted-foreground">
              Content titles / phrases to search (one per line; merged with your library titles when enabled below)
            </Label>
            <Textarea
              id="title-hints"
              value={titleHintsInput}
              onChange={(e) => setTitleHintsInput(e.target.value)}
              placeholder="Exact or partial video or set titles that might appear on leak sites"
              className="min-h-[72px] text-sm"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <Checkbox
            id="include-content-titles"
            checked={includeContentTitles}
            onCheckedChange={(v) => setIncludeContentTitles(v === true)}
          />
          <label htmlFor="include-content-titles" className="text-xs text-muted-foreground leading-snug cursor-pointer">
            Include published / scheduled titles from your content library in search queries (caps apply).
          </label>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={saveIdentityLoading}
          onClick={saveSearchIdentity}
        >
          {saveIdentityLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save former names &amp; title hints
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
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
          Delete saved identities
        </Button>
      </div>

      <div className="flex items-start gap-2">
        <Checkbox
          id="strict-scan"
          checked={strictScan}
          onCheckedChange={(v) => setStrictScan(v === true)}
        />
        <label htmlFor="strict-scan" className="text-xs text-muted-foreground leading-snug cursor-pointer">
          Strict mode: only keep search results that likely match your content (Venus Pro: AI-assisted filtering;
          keyword match otherwise). Your manually pasted links are always kept.
        </label>
      </div>

      {displayHandles.length > 0 && (
        <ScanHandlePicker
          handles={displayHandles}
          useAll={useAllLeakHandles}
          onUseAllChange={(v) => {
            if (!v) return
          }}
          selected={selectedLeakHandles}
          onToggle={(value) => {
            setSelectedLeakHandles((prev) => {
              const next = new Set(prev)
              if (next.has(value)) next.delete(value)
              else next.add(value)
              if (typeof window !== 'undefined') {
                window.localStorage.setItem(
                  'protection_selected_handles',
                  JSON.stringify(Array.from(next)),
                )
              }
              return next
            })
          }}
          idPrefix="leak-scan"
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Optional: one library item (adds its title to the scan)</Label>
          <Select value={focusContentId || '__none__'} onValueChange={(v) => setFocusContentId(v === '__none__' ? '' : v)}>
            <SelectTrigger className="text-sm">
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
          <Label htmlFor="focus-title-filter" className="text-xs text-muted-foreground">
            Optional: narrow title queries (one phrase per line; must match merged titles)
          </Label>
          <Textarea
            id="focus-title-filter"
            value={focusTitleFilter}
            onChange={(e) => setFocusTitleFilter(e.target.value)}
            placeholder="e.g. part of a video title"
            className="min-h-[56px] text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="gap-2 bg-circe hover:bg-circe/90"
              onClick={runScan}
              disabled={
                scanLoading ||
                selectedLeakHandles.size === 0
              }
            >
              {scanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Invoke Scan
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-venus/40 text-venus hover:bg-venus/10"
            >
              <Link href="/dashboard/ai-studio/tools">Open Venus Pro</Link>
            </Button>
          </div>
          {scanSummary ? <p className="text-xs text-muted-foreground sm:max-w-md">{scanSummary}</p> : null}
        </div>
        <div className="w-full sm:max-w-md">
          <Label htmlFor="manual-url" className="text-xs text-muted-foreground">
            Bring your own link
          </Label>
          <div className="mt-1 flex gap-2">
            <Input
              id="manual-url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="Paste infringing URL…"
            />
            <Button variant="outline" onClick={reportManual} disabled={manualLoading || !manualUrl.trim()}>
              {manualLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Report
            </Button>
          </div>
        </div>
      </div>

      {/* Active Alerts list (actionable) */}
      {alertUpdateError ? (
        <p className="text-sm text-destructive" role="alert">
          {alertUpdateError}
        </p>
      ) : null}
      <div className="rounded-lg border border-border bg-muted/15 p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
          <span className="text-xs font-medium text-foreground">Filter queue</span>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] uppercase text-muted-foreground mr-1">Severity</span>
          {ALL_SEVERITIES.map((s) => (
            <Button
              key={s}
              type="button"
              size="sm"
              variant={severityFilters.has(s) ? 'secondary' : 'outline'}
              className="h-7 text-xs capitalize"
              onClick={() => {
                setSeverityFilters((prev) => {
                  const next = new Set(prev)
                  if (next.has(s)) next.delete(s)
                  else next.add(s)
                  if (next.size === 0) next.add(s)
                  return next
                })
              }}
            >
              {s}
            </Button>
          ))}
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
            className="h-7 text-xs gap-1"
            onClick={() => setSeverityFilters(new Set(['critical', 'high']))}
          >
            <RotateCcw className="h-3 w-3" />
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
          Showing {filteredAlerts.length} of {sortedAlerts.length} in the active queue.
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
              className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/30 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex-1 min-w-0 space-y-2">
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
                <div className="text-sm break-all">{alert.source_url}</div>
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
              <div className="flex flex-wrap gap-2 shrink-0">
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
                <Button size="sm" onClick={() => startDmcaFromAlert(alert)}>
                  Download DMCA
                </Button>
              </div>
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

