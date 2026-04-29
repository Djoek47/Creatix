'use client'

import { useEffect, useMemo, useState, useCallback, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { LeakAlert, LeakMediaType, LeakSeverity } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Loader2,
  ExternalLink,
  Upload,
  FileText,
  Filter,
  RotateCcw,
  Coins,
  Shield,
  RefreshCw,
  ScanSearch,
  Mail,
} from 'lucide-react'
import type { LeakAttributionApiResponse, MarkitAttributionResult } from '@/lib/ariadne/attribution-types'
import { cn } from '@/lib/utils'
import { normalizeDiscoveryHostNeedles } from '@/lib/leaks/discovery-focus'
import { useScanIdentity } from '@/hooks/use-scan-identity'
import { ProtectionProScanSetup } from '@/components/protection/protection-pro-scan-setup'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { isPaidPlanId } from '@/lib/billing/access'
import { CREDITS_LEAK_SCAN } from '@/lib/billing/credit-economics'
import { DASHBOARD_CREDIT_SUMMARY_MARK } from '@/lib/dashboard-credit-summary-marker'
import { InsufficientCreditsCallout } from '@/components/billing/insufficient-credits-callout'
import { useCreditInsufficientModal } from '@/components/billing/credit-insufficient-modal-context'
import { useCreditSnapshot } from '@/hooks/use-credit-snapshot'
import { ProtectionModeToggle } from '@/components/protection/protection-mode-toggle'
import { parseLeakMeta, formatNotesLine } from '@/lib/leaks/leak-notes-meta'
import { LeakAlertCard } from '@/components/protection/leak-alert-card'
import { HostReportDestinationUI } from '@/components/protection/host-report-destinations-ui'
import { ProtectionEasyHandles } from '@/components/protection/protection-easy-handles'
import { getPrimaryMailtoRecipientForDestinations } from '@/lib/dmca/host-report-destinations'
import { buildDmcaNoticeMailtoHref } from '@/lib/dmca/dmca-notice-mailto'
import { scanSourcePlatformKey } from '@/lib/scan-identity'

type Props = {
  activeAlerts: LeakAlert[]
  /** Pre-filled from profile; user can edit before scanning */
  suggestedAlias?: string | null
}

const PROTECTION_UI_MODE_KEY = 'protection_ui_mode'

/** Mini marks for social platforms wired in Settings → Integrations (matches settings tab). */
function MiniTwitterLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('shrink-0', className)} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function MiniInstagramLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('shrink-0', className)} fill="currentColor" aria-hidden>
      <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 1.802c-2.67 0-2.986.01-4.04.058-.976.045-1.505.207-1.858.344-.466.182-.8.398-1.15.748-.35.35-.566.684-.748 1.15-.137.353-.3.882-.344 1.857-.048 1.055-.058 1.37-.058 4.041 0 2.67.01 2.986.058 4.04.045.976.207 1.505.344 1.858.182.466.399.8.748 1.15.35.35.684.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058 2.67 0 2.987-.01 4.04-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.684.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041 0-2.67-.01-2.986-.058-4.04-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 0 0-.748-1.15 3.098 3.098 0 0 0-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.055-.048-1.37-.058-4.041-.058zm0 3.063a5.135 5.135 0 1 1 0 10.27 5.135 5.135 0 0 1 0-10.27zm0 8.468a3.333 3.333 0 1 0 0-6.666 3.333 3.333 0 0 0 0 6.666zm6.538-8.671a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z" />
    </svg>
  )
}

function MiniTikTokLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('shrink-0', className)} fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  )
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
  const { openCreditInsufficientModal } = useCreditInsufficientModal()
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
  const connectedMonetizationForToggle = useMemo(() => {
    const keys = new Set(identityHandles.map((h) => scanSourcePlatformKey(h.source)))
    const out: ('onlyfans' | 'fansly')[] = []
    if (keys.has('onlyfans')) out.push('onlyfans')
    if (keys.has('fansly')) out.push('fansly')
    return out
  }, [identityHandles])

  const [uiMode, setUiMode] = useState<'easy' | 'pro'>('easy')
  const [useAllLeakHandles, setUseAllLeakHandles] = useState(true)
  const [selectedLeakHandles, setSelectedLeakHandles] = useState<Set<string>>(new Set())
  const [focusContentId, setFocusContentId] = useState<string>('')
  const [focusTitleFilter, setFocusTitleFilter] = useState('')
  const [focusHostsInput, setFocusHostsInput] = useState('')
  const [scanFocusMedia, setScanFocusMedia] = useState<'all' | 'video' | 'photo'>('all')
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

  /** `mailto:` for the open DMCA dialog — prefers an abuse/inbox email when the scan surfaced one */
  const dmcaEmailCompose = useMemo(() => {
    if (!selectedAlert || !noticeText.trim()) return null
    const to = getPrimaryMailtoRecipientForDestinations(selectedAlert.source_url, selectedAlert.notes ?? null)
    return {
      href: buildDmcaNoticeMailtoHref({ to, body: noticeText }),
      hasResolvedTo: Boolean(to?.trim()),
    }
  }, [selectedAlert, noticeText])

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

  const clearSavedProfileHints = useCallback(async () => {
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
  }, [supabase])

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

  const { confirmedAlerts, queueAlerts } = useMemo(() => {
    const confirmed = filteredAlerts.filter((a) => a.status === 'confirmed')
    const queue = filteredAlerts.filter((a) => a.status !== 'confirmed')
    return { confirmedAlerts: confirmed, queueAlerts: queue }
  }, [filteredAlerts])

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
        const hostNeedles = normalizeDiscoveryHostNeedles(
          focusHostsInput
            .split(/[\n,;]+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0),
        )
        if (hostNeedles.length > 0) {
          body.focus_hosts = hostNeedles
        }
        if (scanFocusMedia !== 'all') {
          body.focus_media = scanFocusMedia
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
        filteredFocus?: number
        pageVerifyCount?: number
        message?: string
        error?: string
      }
      if (res.ok) {
        setScanSummary(
          `Added ${data.inserted ?? 0} new alert(s). Skipped duplicates: ${data.skipped ?? 0}.` +
            (typeof data.filteredStrict === 'number' ? ` Filtered by strict mode: ${data.filteredStrict}.` : '') +
            (typeof data.filteredFocus === 'number' && data.filteredFocus > 0
              ? ` Routed out by Precision: ${data.filteredFocus}.`
              : '') +
            (typeof data.pageVerifyCount === 'number' && data.pageVerifyCount > 0
              ? ` Critical pages verified: ${data.pageVerifyCount}.`
              : '') +
            (data.message ? ` ${data.message}` : ''),
        )
      } else {
        const base = data.error || 'Scan failed.'
        if (res.status === 402) {
          const payload = data as { used?: number; limit?: number }
          openCreditInsufficientModal({
            requiredCredits: CREDITS_LEAK_SCAN,
            used: typeof payload.used === 'number' ? payload.used : undefined,
            limit: typeof payload.limit === 'number' ? payload.limit : undefined,
            contextLabel: 'Leak scan',
          })
          setScanSummary(null)
        } else {
          setScanSummary(base)
        }
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
          {uiMode === 'easy' ? (
            <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground/88">
              <span className="font-medium text-foreground/90">Easy</span> uses linked accounts only.{' '}
              <span className="font-medium text-foreground/90">Pro</span> adds per-handle control, saved aliases, stricter matching, and manual URLs.
            </p>
          ) : (
            <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground/85">
              Shape this run precisely—handles, hints, filtering, focus, and manual reports stay in sync.
            </p>
          )}
        </div>
        <ProtectionModeToggle
          value={uiMode}
          onChange={persistUiMode}
          className="shrink-0"
          connectedPlatforms={connectedMonetizationForToggle}
        />
      </div>

      <p
        className={cn(
          'flex flex-wrap items-center gap-x-5 gap-y-1 border-b pb-4 text-[13px] text-muted-foreground/85 motion-safe:transition-colors sm:gap-x-8',
          uiMode === 'pro' ? 'border-white/[0.06] pb-5' : 'border-border/45',
        )}
      >
        <Link
          href="/dashboard/protection/aegis"
          className={cn(
            'inline-flex items-center gap-1.5 underline-offset-[5px] transition hover:underline',
            uiMode === 'pro' ? 'font-medium text-foreground/90 hover:text-foreground' : 'font-medium text-foreground',
          )}
          title={aegisStatusTitle}
        >
          {aegisEnabled === true ? (
            <Shield
              className="h-4 w-4 shrink-0 text-emerald-400/95 dark:text-emerald-400/90"
              aria-hidden
            />
          ) : null}
          <span>Aegis</span>
        </Link>
        <Link
          href="/dashboard/settings?tab=integrations"
          className={cn(
            'inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 underline-offset-[5px] transition hover:underline',
            uiMode === 'pro' ? 'font-medium text-foreground/90 hover:text-foreground' : 'font-medium text-foreground',
          )}
          title="Connect accounts so scans include linked usernames"
        >
          <RefreshCw
            className="h-3.5 w-3.5 shrink-0 text-emerald-500 motion-safe:animate-[spin_10s_linear_infinite] dark:text-emerald-400"
            aria-hidden
          />
          <span className="-mr-0.5 inline-flex items-center gap-0.5" aria-hidden>
            <MiniTwitterLogo className="h-3 w-3 text-slate-200/90 dark:text-slate-100/85" />
            <MiniInstagramLogo className="h-3 w-3 text-pink-400/95 dark:text-pink-300/85" />
            <MiniTikTokLogo className="h-3 w-3 text-cyan-200/90 dark:text-cyan-200/80" />
          </span>
          <span className="-ml-0.5">Integrations</span>
        </Link>
      </p>

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

      {uiMode === 'pro' ? (
        <ProtectionProScanSetup
          displayHandles={displayHandles}
          useAllLeakHandles={useAllLeakHandles}
          onUseAllLeakHandlesChange={handleUseAllLeakHandlesChange}
          selectedLeakHandles={selectedLeakHandles}
          onToggleLeakHandle={handleToggleLeakHandle}
          includeContentTitles={includeContentTitles}
          onIncludeContentTitlesChange={setIncludeContentTitles}
          strictScan={strictScan}
          onStrictScanChange={setStrictScan}
          advancedOpen={advancedOpen}
          onAdvancedOpenChange={setAdvancedOpen}
          aliasInput={aliasInput}
          onAliasInputChange={setAliasInput}
          formerInput={formerInput}
          onFormerInputChange={setFormerInput}
          titleHintsInput={titleHintsInput}
          onTitleHintsInputChange={setTitleHintsInput}
          saveIdentityLoading={saveIdentityLoading}
          onSaveIdentity={saveSearchIdentity}
          onClearSavedHints={clearSavedProfileHints}
          contentTitles={contentTitles}
          focusContentId={focusContentId}
          onFocusContentIdChange={setFocusContentId}
          focusTitleFilter={focusTitleFilter}
          onFocusTitleFilterChange={setFocusTitleFilter}
          focusHostsInput={focusHostsInput}
          onFocusHostsInputChange={setFocusHostsInput}
          scanFocusMedia={scanFocusMedia}
          onScanFocusMediaChange={setScanFocusMedia}
        />
      ) : null}

      <div className="space-y-5 border-t border-border/45 pt-6 sm:pt-8">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <div
            className={cn(
              'inline-flex max-w-full items-center gap-2 rounded-xl border border-border/55 bg-muted/30 px-3 py-1.5 tabular-nums dark:bg-muted/20',
              leakScanBlockedByBalance && 'border-destructive/35 bg-destructive/8 text-destructive',
            )}
            title="AI credit wallet: included monthly pool plus any purchases."
            {...DASHBOARD_CREDIT_SUMMARY_MARK}
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
            <div className="w-full shrink-0 space-y-3 rounded-[1.125rem] border border-white/[0.08] bg-background/30 px-5 py-4 backdrop-blur-[2px] dark:bg-background/[0.12] lg:max-w-[min(100%,20rem)]">
              <div>
                <Label htmlFor="manual-url" className="text-[14px] font-medium tracking-tight text-foreground">
                  Report a URL
                </Label>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground/85">
                  Outside the automated run—still recorded with your leaks.
                </p>
              </div>
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
          {' '}matching filters
          {confirmedAlerts.length > 0 ? (
            <span className="text-muted-foreground/85">
              {' '}
              — <span className="tabular-nums">{confirmedAlerts.length}</span> confirmed (pinned above triage)
            </span>
          ) : null}
          .
        </p>
      </div>
      <div className="space-y-8">
        {confirmedAlerts.length > 0 ? (
          <section className="space-y-3" aria-labelledby="confirmed-leaks-heading">
            <div>
              <h2 id="confirmed-leaks-heading" className="text-[13px] font-semibold tracking-tight text-foreground">
                Confirmed · act next
              </h2>
              <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-muted-foreground">
                You marked these as your content—follow up soon. Undo sends the row back to triage; “Not mine” dismisses it.
              </p>
            </div>
            <div className="space-y-4">
              {confirmedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:fill-mode-both motion-reduce:animate-none"
                >
                  <LeakAlertCard
                    alert={alert}
                    presentation="confirmedLane"
                    meta={parseLeakMeta(alert.notes)}
                    isPro={isPro}
                    verifying={verifyLoadingId === alert.id}
                    tracing={traceLoadingId === alert.id}
                    attribution={attributionByAlertId[alert.id]}
                    attributionError={attributionErrorByAlertId[alert.id] ?? null}
                    onPatch={(id, body) => void patchLeakAlert(id, body)}
                    onVerify={(id) => void verifyLeakPage(id)}
                    onTrace={(a) => void runLeakUrlAttribution(a)}
                    onDmca={startDmcaFromAlert}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}
        {queueAlerts.length > 0 ? (
          <section className="space-y-5" aria-labelledby={confirmedAlerts.length > 0 ? 'triage-queue-heading' : undefined}>
            {confirmedAlerts.length > 0 ? (
              <h2 id="triage-queue-heading" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Triage
              </h2>
            ) : null}
            {queueAlerts.map((alert) => (
              <LeakAlertCard
                key={alert.id}
                alert={alert}
                meta={parseLeakMeta(alert.notes)}
                isPro={isPro}
                verifying={verifyLoadingId === alert.id}
                tracing={traceLoadingId === alert.id}
                attribution={attributionByAlertId[alert.id]}
                attributionError={attributionErrorByAlertId[alert.id] ?? null}
                onPatch={(id, body) => void patchLeakAlert(id, body)}
                onVerify={(id) => void verifyLeakPage(id)}
                onTrace={(a) => void runLeakUrlAttribution(a)}
                onDmca={startDmcaFromAlert}
              />
            ))}
          </section>
        ) : null}
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
                The description field in the notice below includes your last “Trace to original recipient” summary for this
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

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  {dmcaEmailCompose ? (
                    <Button asChild variant="default" className="w-full sm:w-auto">
                      <a
                        href={dmcaEmailCompose.href}
                        rel="nofollow"
                        aria-label="Open your email app with this DMCA draft"
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Send via email
                      </a>
                    </Button>
                  ) : null}
                  <Button
                    asChild
                    variant="outline"
                    disabled={proofPaths.length === 0}
                    className="w-full sm:w-auto"
                  >
                    <a href={`/api/dmca/claim/${claimId}/download`}>
                      <FileText className="mr-2 h-4 w-4" />
                      Download DMCA Notice
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto sm:min-w-[6.5rem]"
                    onClick={() => {
                      setDmcaOpen(false)
                      setSelectedAlert(null)
                    }}
                  >
                    Close
                  </Button>
                </div>
                {dmcaEmailCompose && !dmcaEmailCompose.hasResolvedTo ? (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Add the site’s abuse contact in <span className="font-medium text-foreground">To:</span>
                    {' — we couldn’t derive it from this scan.'}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

