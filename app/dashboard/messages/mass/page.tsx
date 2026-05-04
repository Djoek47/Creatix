'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Bot, Check, DollarSign, Loader2, Search, Send, Shield, Sparkles, Target, Users, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fetchCrmFansHybrid } from '@/lib/crm/fetch-crm-fans-client'
import type { CrmFanListItem } from '@/lib/crm/crm-fan-types'
import { estimateMassCampaignCredits } from '@/lib/messages/mass-campaign-credits'
import { getCreditsForToolId } from '@/lib/billing/credit-economics'
import { DASHBOARD_CREDIT_SUMMARY_MARK } from '@/lib/dashboard-credit-summary-marker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type FanRecord = {
  id: string
  platform: 'onlyfans' | 'fansly'
  platformFanId: string
  username: string
  displayName: string | null
  totalSpent: number
  creatorClassification: string | null
  subscriptionTier: string | null
  subscriptionStatus: string | null
  tags: string[]
}

type ApiSegment = {
  id: string
  name: string
  rationale: string
  match: {
    creator_classifications?: string[]
    subscription_tiers?: string[]
    subscription_statuses?: string[]
    platforms?: string[]
    min_total_spent?: number
  }
  estimated_count_hint?: string
}

type SuggestedAudience = {
  fanId: string
  platform: 'onlyfans' | 'fansly'
  score: number
  reason: string
}

type PerFanDraft = {
  caption: string
  price: string
}

type CreditSnapshot = {
  wallet?: { totalRemaining: number }
  aiCreditsLimitEffective?: number
  aiCreditsUsed?: number
  aiCreditsRemainingLegacy?: number
}

function fanKey(fan: FanRecord): string {
  return `${fan.platform}:${fan.platformFanId || fan.id}`
}

function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`
}

function matchesSegment(fan: FanRecord, match: ApiSegment['match']): boolean {
  if (match.platforms?.length && !match.platforms.includes(fan.platform)) return false
  if (match.creator_classifications?.length) {
    const cls = (fan.creatorClassification || '').trim() || '(unlabeled)'
    if (!match.creator_classifications.includes(cls)) return false
  }
  if (match.subscription_tiers?.length) {
    const tier = (fan.subscriptionTier || '').trim() || '(none)'
    if (!match.subscription_tiers.includes(tier)) return false
  }
  if (match.subscription_statuses?.length) {
    const status = (fan.subscriptionStatus || '').trim()
    if (!match.subscription_statuses.includes(status)) return false
  }
  if (match.min_total_spent != null && fan.totalSpent < match.min_total_spent) return false
  return true
}

function parsePriceInput(value: string): number | null {
  if (!value.trim()) return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

export default function MassMessagesPage() {
  const t = useTranslations('massCampaign')
  const supabase = useMemo(() => createClient(), [])
  const [platformScope, setPlatformScope] = useState<'all' | 'onlyfans' | 'fansly'>('all')
  const [fans, setFans] = useState<FanRecord[]>([])
  const [crmWarnings, setCrmWarnings] = useState<string[]>([])
  const [loadingFans, setLoadingFans] = useState(true)
  const [hasFanPlatformConnected, setHasFanPlatformConnected] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedFanKeys, setSelectedFanKeys] = useState<string[]>([])
  const [segments, setSegments] = useState<ApiSegment[]>([])
  const [loadingSegments, setLoadingSegments] = useState(false)
  const [segmentGoal, setSegmentGoal] = useState('')
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)
  const [audienceGoal, setAudienceGoal] = useState('')
  const [audienceTargetRevenue, setAudienceTargetRevenue] = useState('')
  const [loadingAudienceSuggest, setLoadingAudienceSuggest] = useState(false)
  const [audienceSuggestions, setAudienceSuggestions] = useState<SuggestedAudience[]>([])
  const [baseMessage, setBaseMessage] = useState('')
  const [defaultPrice, setDefaultPrice] = useState('')
  const [perFanDrafts, setPerFanDrafts] = useState<Record<string, PerFanDraft>>({})
  const [captionTone, setCaptionTone] = useState(() => t('copyPricing.defaultTone'))
  const [captionCta, setCaptionCta] = useState(() => t('copyPricing.defaultCta'))
  const [minPrice, setMinPrice] = useState('5')
  const [maxPrice, setMaxPrice] = useState('35')
  const [expectedRevenue, setExpectedRevenue] = useState('')
  const [loadingCaptions, setLoadingCaptions] = useState(false)
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{
    success: boolean
    sent: number
    failed: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mediaIds, setMediaIds] = useState<string[]>([])
  /** Comma-separated Fansly vault / media ids for Fansly DMs and PPV in this campaign. */
  const [fanslyMediaIdsText, setFanslyMediaIdsText] = useState('')
  const [fanslyUploadedMediaIds, setFanslyUploadedMediaIds] = useState<string[]>([])
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [uploadingFanslyMedia, setUploadingFanslyMedia] = useState(false)
  const [creditSnapshot, setCreditSnapshot] = useState<CreditSnapshot | null>(null)
  const [creditSnapshotLoading, setCreditSnapshotLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fanslyFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        setLoadingFans(false)
        return
      }
      const [{ data: conns }, crm] = await Promise.all([
        supabase
          .from('platform_connections')
          .select('id')
          .eq('user_id', auth.user.id)
          .eq('is_connected', true)
          .in('platform', ['onlyfans', 'fansly'])
          .limit(1),
        fetchCrmFansHybrid().catch(() => null as Awaited<ReturnType<typeof fetchCrmFansHybrid>> | null),
      ])
      setHasFanPlatformConnected((conns?.length ?? 0) > 0)
      if (!crm) {
        setFans([])
        setLoadingFans(false)
        return
      }
      setHasFanPlatformConnected((conns?.length ?? 0) > 0 || crm.meta.onlyFansConnected || crm.meta.fanslyConnected)
      setCrmWarnings(crm.meta.warnings ?? [])
      const mapped = crm.fans
        .map((f: CrmFanListItem) => {
          const platform = f.platform === 'fansly' ? 'fansly' : f.platform === 'onlyfans' ? 'onlyfans' : null
          if (!platform) return null
          const id = String(f.id || '').trim()
          if (!id) return null
          const platformFanId = String(f.platform_fan_id || f.id || '').trim()
          return {
            id,
            platform,
            platformFanId: platformFanId || id,
            username: (f.platform_username || '').trim() || 'fan',
            displayName: f.display_name || null,
            totalSpent: Number(f.total_spent || 0) || 0,
            creatorClassification: f.creator_classification ?? null,
            subscriptionTier: f.subscription_tier_raw ?? null,
            subscriptionStatus: f.subscription_status_raw ?? null,
            tags: Array.isArray(f.tags) ? f.tags.map((x) => String(x)) : [],
          } satisfies FanRecord
        })
        .filter((f): f is FanRecord => f != null)
      setFans(mapped)
      setLoadingFans(false)
    })()
  }, [supabase])

  useEffect(() => {
    let cancelled = false
    setCreditSnapshotLoading(true)
    void (async () => {
      try {
        const res = await fetch('/api/billing/credit-snapshot', { credentials: 'include' })
        const data = (await res.json().catch(() => ({}))) as CreditSnapshot
        if (!res.ok || cancelled) return
        setCreditSnapshot(data)
      } finally {
        if (!cancelled) setCreditSnapshotLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const fansScoped = useMemo(() => {
    if (platformScope === 'all') return fans
    return fans.filter((fan) => fan.platform === platformScope)
  }, [fans, platformScope])

  const fansFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return fansScoped
    return fansScoped.filter((fan) =>
      [fan.username, fan.displayName || '', fan.creatorClassification || '', fan.platformFanId]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [fansScoped, search])

  const fanByKey = useMemo(() => {
    const map = new Map<string, FanRecord>()
    for (const fan of fans) map.set(fanKey(fan), fan)
    return map
  }, [fans])

  const selectedFans = useMemo(
    () => selectedFanKeys.map((key) => fanByKey.get(key)).filter((fan): fan is FanRecord => fan != null),
    [selectedFanKeys, fanByKey],
  )
  const selectionStats = useMemo(() => {
    const byPlatform = { onlyfans: 0, fansly: 0 }
    for (const fan of selectedFans) byPlatform[fan.platform] += 1
    return byPlatform
  }, [selectedFans])

  const runAllCost = useMemo(
    () =>
      estimateMassCampaignCredits({
        recipientCount: selectedFans.length,
        includeAudienceSuggestionRun: true,
        includeCaptionGenerationRun: selectedFans.length > 0,
        includePriceGenerationRun: selectedFans.length > 0,
        personalizedSend: true,
      }),
    [selectedFans.length],
  )

  const remainingCredits = creditSnapshot?.wallet?.totalRemaining ?? creditSnapshot?.aiCreditsRemainingLegacy ?? null
  const hasEnoughForRunAll = remainingCredits == null || remainingCredits >= runAllCost.total

  const ensureFanDrafts = (keys: string[]) => {
    setPerFanDrafts((prev) => {
      const next = { ...prev }
      for (const key of keys) {
        if (next[key]) continue
        next[key] = { caption: '', price: '' }
      }
      return next
    })
  }

  const updateSelection = (nextKeys: string[]) => {
    const unique = Array.from(new Set(nextKeys))
    setSelectedFanKeys(unique)
    ensureFanDrafts(unique)
  }

  const toggleFanSelection = (key: string) => {
    updateSelection(selectedFanKeys.includes(key) ? selectedFanKeys.filter((k) => k !== key) : [...selectedFanKeys, key])
  }

  const selectAllFiltered = () => updateSelection([...selectedFanKeys, ...fansFiltered.map((f) => fanKey(f))])
  const clearSelection = () => setSelectedFanKeys([])

  const applySegmentToSelection = (segment: ApiSegment) => {
    const keys = fansScoped.filter((fan) => matchesSegment(fan, segment.match)).map((fan) => fanKey(fan))
    updateSelection(keys)
    setSelectedSegmentId(segment.id)
    if (segment.rationale?.trim()) {
      setBaseMessage((prev) => {
        const p = prev.trim()
        return p ? `${p}\n\n${segment.rationale.trim()}` : segment.rationale.trim()
      })
    }
  }

  const runSegments = async () => {
    setLoadingSegments(true)
    setError(null)
    try {
      const res = await fetch('/api/messages/mass/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: segmentGoal,
          platform: platformScope === 'all' ? undefined : platformScope,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; segments?: ApiSegment[] }
      if (!res.ok) throw new Error(data.error || t('errors.segmentSuggestFailed'))
      setSegments(Array.isArray(data.segments) ? data.segments : [])
      setSelectedSegmentId(null)
    } catch (e) {
      setSegments([])
      setError(e instanceof Error ? e.message : t('errors.segmentSuggestFailed'))
    } finally {
      setLoadingSegments(false)
    }
  }

  const runAudienceSuggestion = async () => {
    setLoadingAudienceSuggest(true)
    setError(null)
    try {
      const res = await fetch('/api/messages/mass/suggest-audience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: audienceGoal,
          targetRevenueUsd: parsePriceInput(audienceTargetRevenue) ?? undefined,
          platform: platformScope,
          maxFans: 20,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        suggestions?: SuggestedAudience[]
      }
      if (!res.ok) throw new Error(data.error || t('errors.audienceSuggestFailed'))
      const suggestions = Array.isArray(data.suggestions) ? data.suggestions : []
      setAudienceSuggestions(suggestions)
      const keys = suggestions
        .map((s) => fans.find((f) => f.id === s.fanId && f.platform === s.platform))
        .filter((f): f is FanRecord => f != null)
        .map((f) => fanKey(f))
      if (keys.length > 0) updateSelection(keys)
    } catch (e) {
      setAudienceSuggestions([])
      setError(e instanceof Error ? e.message : t('errors.audienceSuggestFailed'))
    } finally {
      setLoadingAudienceSuggest(false)
    }
  }

  const uploadMedia = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files?.length) return
    setUploadingMedia(true)
    try {
      const { uploadLocalFileToOnlyFansMedia } = await import('@/lib/onlyfans-upload-client')
      const uploaded: string[] = []
      for (let i = 0; i < files.length; i += 1) {
        const data = await uploadLocalFileToOnlyFansMedia(files[i])
        if (data.id) uploaded.push(String(data.id))
      }
      if (uploaded.length > 0) {
        setMediaIds((prev) => Array.from(new Set([...prev, ...uploaded])))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.uploadOfFailed'))
    } finally {
      setUploadingMedia(false)
      event.target.value = ''
    }
  }

  const uploadFanslyMedia = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files?.length) return
    setUploadingFanslyMedia(true)
    try {
      const { uploadLocalFileToFanslyMedia } = await import('@/lib/fansly-upload-client')
      const uploaded: string[] = []
      for (let i = 0; i < files.length; i += 1) {
        const data = await uploadLocalFileToFanslyMedia(files[i])
        if (data.id) uploaded.push(String(data.id))
      }
      if (uploaded.length > 0) {
        setFanslyUploadedMediaIds((prev) => Array.from(new Set([...prev, ...uploaded])))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.uploadFanslyFailed'))
    } finally {
      setUploadingFanslyMedia(false)
      event.target.value = ''
    }
  }

  const generateCaptions = async () => {
    if (selectedFans.length === 0) return
    setLoadingCaptions(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/mass-dm-fan-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignBrief: baseMessage,
          tone: captionTone,
          callToAction: captionCta,
          fans: selectedFans.map((fan) => ({
            fanId: fan.id,
            platform: fan.platform,
            username: fan.username,
            displayName: fan.displayName,
            totalSpent: fan.totalSpent,
            creatorClassification: fan.creatorClassification,
            subscriptionTier: fan.subscriptionTier,
            subscriptionStatus: fan.subscriptionStatus,
          })),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        suggestions?: Array<{ fanId: string; caption: string }>
      }
      if (!res.ok) throw new Error(data.error || t('errors.captionGenerationFailed'))
      const byFanId = new Map((data.suggestions || []).map((row) => [row.fanId, row.caption]))
      setPerFanDrafts((prev) => {
        const next = { ...prev }
        for (const fan of selectedFans) {
          const key = fanKey(fan)
          next[key] = {
            caption: byFanId.get(fan.id) || prev[key]?.caption || '',
            price: prev[key]?.price || '',
          }
        }
        return next
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.captionGenerationFailed'))
    } finally {
      setLoadingCaptions(false)
    }
  }

  const generatePrices = async () => {
    if (selectedFans.length === 0) return
    setLoadingPrices(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/mass-dm-ppv-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minPrice: parsePriceInput(minPrice) ?? 5,
          maxPrice: parsePriceInput(maxPrice) ?? 35,
          targetTotalUsd: parsePriceInput(expectedRevenue) ?? undefined,
          expectedBuyers: Math.max(1, selectedFans.length),
          fans: selectedFans.map((fan) => ({
            fanId: fan.id,
            platform: fan.platform,
            username: fan.username,
            displayName: fan.displayName,
            totalSpent: fan.totalSpent,
            creatorClassification: fan.creatorClassification,
            subscriptionTier: fan.subscriptionTier,
            subscriptionStatus: fan.subscriptionStatus,
          })),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        suggestions?: Array<{ fanId: string; price: number }>
      }
      if (!res.ok) throw new Error(data.error || t('errors.ppvPricingFailed'))
      const byFanId = new Map((data.suggestions || []).map((row) => [row.fanId, row.price]))
      setPerFanDrafts((prev) => {
        const next = { ...prev }
        for (const fan of selectedFans) {
          const key = fanKey(fan)
          const p = byFanId.get(fan.id)
          next[key] = {
            caption: prev[key]?.caption || '',
            price: p != null ? String(p) : prev[key]?.price || '',
          }
        }
        return next
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.ppvPricingFailed'))
    } finally {
      setLoadingPrices(false)
    }
  }

  const sendCampaign = async () => {
    setError(null)
    setSendResult(null)
    if (selectedFans.length === 0) {
      setError(t('errors.selectFans'))
      return
    }
    const defaultNumericPrice = parsePriceInput(defaultPrice)
    const fromText = fanslyMediaIdsText
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    const fanslyMediaIds = Array.from(new Set([...fanslyUploadedMediaIds, ...fromText]))

    const targets = selectedFans
      .map((fan) => {
        const key = fanKey(fan)
        const draft = perFanDrafts[key]
        const caption = (draft?.caption || baseMessage).trim()
        const price = parsePriceInput(draft?.price || '') ?? defaultNumericPrice
        if (!caption) return null
        return {
          platform: fan.platform,
          fanId: fan.platformFanId,
          message: caption,
          price: price ?? undefined,
          username: fan.username,
          displayName: fan.displayName,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row != null)

    if (targets.length === 0) {
      setError(t('errors.needCaption'))
      return
    }

    const needsFanslyPpvMedia = targets.some(
      (t) => t.platform === 'fansly' && typeof t.price === 'number' && t.price > 0,
    )
    if (needsFanslyPpvMedia && fanslyMediaIds.length === 0) {
      setError(t('errors.fanslyPpvMedia'))
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/messages/mass/campaign-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'personalized',
          targets,
          mediaIds,
          fanslyMediaIds: fanslyMediaIds.length > 0 ? fanslyMediaIds : undefined,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        success: boolean
        sent: number
        failed: number
      }
      if (!res.ok) throw new Error(data.error || t('errors.campaignFailed'))
      setSendResult({
        success: Boolean(data.success),
        sent: Number(data.sent ?? 0),
        failed: Number(data.failed ?? 0),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.campaignFailed'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-[calc(100dvh-6rem)] bg-gradient-to-b from-background via-background to-muted/30">
      <div className="mx-auto max-w-5xl space-y-10 px-5 py-12 pb-24 sm:px-8 sm:py-16">
        <header className="space-y-6 border-b border-border/30 pb-10">
          <Button variant="ghost" size="sm" asChild className="-ml-2 h-9 gap-2 text-muted-foreground hover:text-foreground">
            <Link href="/dashboard/messages">
              <ArrowLeft className="h-4 w-4" />
              {t('hero.back')}
            </Link>
          </Button>
          <div className="space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">{t('hero.eyebrow')}</p>
            <h1 className="text-3xl font-light tracking-tight text-foreground sm:text-4xl">{t('hero.title')}</h1>
            <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{t('hero.subtitle')}</p>
          </div>
        </header>

        {error ? (
          <Alert variant="destructive" className="rounded-2xl border-destructive/30 bg-destructive/5">
            <AlertTitle className="font-medium">{t('alerts.failedTitle')}</AlertTitle>
            <AlertDescription className="text-sm leading-relaxed">{error}</AlertDescription>
          </Alert>
        ) : null}

        {sendResult ? (
          <Alert className="rounded-2xl border-border/40 bg-card/80 shadow-sm">
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <AlertTitle className="font-medium">{t('alerts.campaignTitle')}</AlertTitle>
            <AlertDescription className="text-sm leading-relaxed text-muted-foreground">
              {t('alerts.sentSummary', { sent: sendResult.sent, failed: sendResult.failed })}
            </AlertDescription>
          </Alert>
        ) : null}

        <section className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
          <div className="space-y-6 rounded-3xl border border-border/40 bg-card/40 p-6 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] backdrop-blur-sm sm:p-8 dark:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{t('audience.kicker')}</p>
                <h2 className="text-xl font-light tracking-tight">{t('audience.title')}</h2>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{t('audience.hint')}</p>
              </div>
              <Badge variant="secondary" className="h-8 shrink-0 gap-1.5 rounded-full px-3 font-normal">
                <Users className="h-3.5 w-3.5 opacity-70" />
                {t('audience.selected', { count: selectedFans.length })}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={platformScope} onValueChange={(v: 'all' | 'onlyfans' | 'fansly') => setPlatformScope(v)}>
                <SelectTrigger className="h-10 w-[min(100%,11rem)] rounded-xl border-border/50 bg-background/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('audience.platformAll')}</SelectItem>
                  <SelectItem value="onlyfans">{t('audience.platformFilterOnlyfans')}</SelectItem>
                  <SelectItem value="fansly">{t('audience.platformFilterFansly')}</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/80" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 rounded-xl border-border/50 bg-background/80 pl-9"
                  placeholder={t('audience.searchPlaceholder')}
                />
              </div>
              <Button type="button" variant="outline" size="sm" className="h-10 rounded-xl" onClick={selectAllFiltered}>
                {t('audience.selectFiltered')}
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-10 rounded-xl text-muted-foreground" onClick={clearSelection}>
                {t('audience.clear')}
              </Button>
            </div>
          {crmWarnings.length > 0 ? (
            <p className="text-xs text-amber-600 dark:text-amber-500">{crmWarnings.join(' ')}</p>
          ) : null}
          <div className="max-h-[28rem] overflow-auto rounded-2xl border border-border/40 bg-background/40">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="w-10" />
                  <TableHead className="font-medium text-muted-foreground">{t('audience.tableFan')}</TableHead>
                  <TableHead className="font-medium text-muted-foreground">{t('audience.tablePlatform')}</TableHead>
                  <TableHead className="font-medium text-muted-foreground">{t('audience.tableSpent')}</TableHead>
                  <TableHead className="font-medium text-muted-foreground">{t('audience.tableTags')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingFans ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('audience.loadingFans')}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : fansFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      {hasFanPlatformConnected ? t('audience.emptyFiltered') : t('audience.emptyConnect')}
                    </TableCell>
                  </TableRow>
                ) : (
                  fansFiltered.slice(0, 500).map((fan) => {
                    const key = fanKey(fan)
                    const selected = selectedFanKeys.includes(key)
                    return (
                      <TableRow key={key} data-state={selected ? 'selected' : undefined} className="border-border/30">
                        <TableCell>
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => toggleFanSelection(key)}
                            aria-label={t('audience.selectAria', { name: fan.username })}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{fan.displayName || fan.username}</span>
                            <span className="text-xs text-muted-foreground">@{fan.username} · {fan.platformFanId}</span>
                          </div>
                        </TableCell>
                        <TableCell className="uppercase text-xs">{fan.platform}</TableCell>
                        <TableCell>{formatUsd(fan.totalSpent)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {fan.creatorClassification ? <Badge variant="outline">{fan.creatorClassification}</Badge> : null}
                            {fan.subscriptionTier ? <Badge variant="secondary">{fan.subscriptionTier}</Badge> : null}
                            {fan.subscriptionStatus ? <Badge variant="secondary">{fan.subscriptionStatus}</Badge> : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

          <div className="space-y-6">
            <div className="space-y-4 rounded-3xl border border-border/40 bg-card/40 p-6 backdrop-blur-sm sm:p-7">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-sky-600/90 dark:text-sky-400/90" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{t('segments.kicker')}</p>
                  <p className="text-sm font-light">{t('segments.title')}</p>
                </div>
              </div>
              <Input
                value={segmentGoal}
                onChange={(e) => setSegmentGoal(e.target.value)}
                placeholder={t('segments.goalPlaceholder')}
                className="h-10 rounded-xl border-border/50 bg-background/80"
              />
              <Button
                type="button"
                className="h-10 w-full gap-2 rounded-xl"
                variant="outline"
                onClick={() => void runSegments()}
                disabled={loadingSegments}
              >
                {loadingSegments ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {t('segments.cta', { credits: getCreditsForToolId('mass-dm-audience-suggester') })}
              </Button>
              <div className="mt-2 space-y-2">
              {segments.map((segment) => {
                const matched = fansScoped.filter((fan) => matchesSegment(fan, segment.match)).length
                return (
                  <div key={segment.id} className="rounded-md border border-border/60 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{segment.name}</p>
                        <p className="text-xs text-muted-foreground">{segment.rationale}</p>
                      </div>
                      <Badge variant={selectedSegmentId === segment.id ? 'default' : 'secondary'} className="rounded-full font-normal">
                        {t('segments.matchBadge', { count: matched })}
                      </Badge>
                    </div>
                    <Button type="button" size="sm" variant="ghost" className="mt-1.5 h-8 rounded-lg px-2.5" onClick={() => applySegmentToSelection(segment)}>
                      {t('segments.apply')}
                    </Button>
                  </div>
                )
              })}
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-border/40 bg-card/40 p-6 backdrop-blur-sm sm:p-7">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-sky-600/90 dark:text-sky-400/90" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{t('audienceRank.kicker')}</p>
                  <p className="text-sm font-light">{t('audienceRank.title')}</p>
                </div>
              </div>
              <Input
                value={audienceGoal}
                onChange={(e) => setAudienceGoal(e.target.value)}
                placeholder={t('audienceRank.goalPlaceholder')}
                className="h-10 rounded-xl border-border/50 bg-background/80"
              />
              <Input
                value={audienceTargetRevenue}
                onChange={(e) => setAudienceTargetRevenue(e.target.value)}
                className="h-10 rounded-xl border-border/50 bg-background/80"
                type="number"
                min={0}
                step={1}
                placeholder={t('audienceRank.revenuePlaceholder')}
              />
              <Button type="button" className="h-10 w-full gap-2 rounded-xl" onClick={() => void runAudienceSuggestion()} disabled={loadingAudienceSuggest}>
                {loadingAudienceSuggest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                {t('audienceRank.cta', { credits: getCreditsForToolId('mass-dm-audience-suggester') })}
              </Button>
              {audienceSuggestions.length > 0 ? (
              <div className="mt-2 max-h-56 space-y-1 overflow-auto rounded-md border border-border/60 p-2">
                {audienceSuggestions.map((item) => {
                  const fan = fans.find((f) => f.id === item.fanId && f.platform === item.platform)
                  return (
                    <div key={`${item.platform}:${item.fanId}`} className="rounded-md border border-border/50 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium">{fan ? `@${fan.username}` : item.fanId}</p>
                        <Badge variant="outline" className="rounded-full font-normal">
                          {t('audienceRank.score', { score: item.score })}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
                    </div>
                  )
                })}
              </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-8 rounded-3xl border border-border/40 bg-card/40 p-6 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] backdrop-blur-sm sm:p-8 dark:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{t('copyPricing.kicker')}</p>
              <h2 className="text-xl font-light tracking-tight">{t('copyPricing.title')}</h2>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{t('copyPricing.hint')}</p>
            </div>
            <Badge variant="secondary" className="h-8 shrink-0 rounded-full px-3 font-normal">
              {t('copyPricing.mixBadge', { of: selectionStats.onlyfans, fl: selectionStats.fansly })}
            </Badge>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">{t('copyPricing.baseAngle')}</Label>
              <Textarea
                value={baseMessage}
                onChange={(e) => setBaseMessage(e.target.value)}
                placeholder={t('copyPricing.baseAnglePlaceholder')}
                className="min-h-32 rounded-2xl border-border/50 bg-background/80 text-[15px] leading-relaxed"
              />
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">{t('copyPricing.defaultPpv')}</Label>
                <Input
                  value={defaultPrice}
                  onChange={(e) => setDefaultPrice(e.target.value)}
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder={t('copyPricing.defaultPpvPlaceholder')}
                  className="h-10 rounded-xl border-border/50 bg-background/80"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">{t('copyPricing.tone')}</Label>
                <Input value={captionTone} onChange={(e) => setCaptionTone(e.target.value)} className="h-10 rounded-xl border-border/50 bg-background/80" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">{t('copyPricing.cta')}</Label>
                <Input value={captionCta} onChange={(e) => setCaptionCta(e.target.value)} className="h-10 rounded-xl border-border/50 bg-background/80" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 rounded-xl"
              onClick={() => void generateCaptions()}
              disabled={loadingCaptions || selectedFans.length === 0}
            >
              {loadingCaptions ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {t('copyPricing.genCaptions', { credits: getCreditsForToolId('mass-dm-fan-captions') })}
            </Button>
            <Input
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              type="number"
              min={0}
              step={0.01}
              className="h-10 w-24 rounded-xl border-border/50 bg-background/80"
              placeholder={t('copyPricing.min')}
            />
            <Input
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              type="number"
              min={0}
              step={0.01}
              className="h-10 w-24 rounded-xl border-border/50 bg-background/80"
              placeholder={t('copyPricing.max')}
            />
            <Input
              value={expectedRevenue}
              onChange={(e) => setExpectedRevenue(e.target.value)}
              type="number"
              min={0}
              step={1}
              className="h-10 w-36 rounded-xl border-border/50 bg-background/80"
              placeholder={t('copyPricing.targetRevenue')}
            />
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 rounded-xl"
              onClick={() => void generatePrices()}
              disabled={loadingPrices || selectedFans.length === 0}
            >
              {loadingPrices ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
              {t('copyPricing.optimizePpv', { credits: getCreditsForToolId('mass-dm-ppv-pricing') })}
            </Button>
          </div>

          <div className="max-h-[22rem] overflow-auto rounded-2xl border border-border/40 bg-background/40">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="font-medium text-muted-foreground">{t('copyPricing.tableFan')}</TableHead>
                  <TableHead className="font-medium text-muted-foreground">{t('copyPricing.tableCaption')}</TableHead>
                  <TableHead className="w-28 font-medium text-muted-foreground">{t('copyPricing.tablePrice')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedFans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                      {t('copyPricing.emptySelection')}
                    </TableCell>
                  </TableRow>
              ) : (
                selectedFans.slice(0, 120).map((fan) => {
                  const key = fanKey(fan)
                  const draft = perFanDrafts[key] ?? { caption: '', price: '' }
                  return (
                    <TableRow key={key}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{fan.displayName || fan.username}</span>
                          <span className="text-xs text-muted-foreground">@{fan.username} · {fan.platform.toUpperCase()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Textarea
                          value={draft.caption}
                          onChange={(e) => setPerFanDrafts((prev) => ({ ...prev, [key]: { caption: e.target.value, price: prev[key]?.price || '' } }))}
                          placeholder={baseMessage || t('copyPricing.captionPlaceholder')}
                          className="min-h-20 rounded-xl border-border/50 bg-background/80"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={draft.price}
                          onChange={(e) => setPerFanDrafts((prev) => ({ ...prev, [key]: { caption: prev[key]?.caption || '', price: e.target.value } }))}
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder={defaultPrice || '0'}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-2xl border border-border/40 bg-background/50 p-5">
              <div className="space-y-1">
                <p className="text-sm font-medium tracking-tight">{t('media.fanslyTitle')}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{t('media.fanslyHint')}</p>
              </div>
              <input ref={fanslyFileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={uploadFanslyMedia} />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl"
                  onClick={() => fanslyFileInputRef.current?.click()}
                  disabled={uploadingFanslyMedia}
                >
                  {uploadingFanslyMedia ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('media.attachFansly')}
                </Button>
                {fanslyUploadedMediaIds.map((id) => (
                  <Badge key={id} variant="secondary" className="gap-1 rounded-full font-mono text-[11px] font-normal">
                    {id.slice(0, 8)}…
                    <button
                      type="button"
                      aria-label={t('composer.removeMediaAria')}
                      className="opacity-70 hover:opacity-100"
                      onClick={() => setFanslyUploadedMediaIds((prev) => prev.filter((x) => x !== id))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                value={fanslyMediaIdsText}
                onChange={(e) => setFanslyMediaIdsText(e.target.value)}
                placeholder={t('media.fanslyIdsPlaceholder')}
                className="font-mono text-sm rounded-xl border-border/50 bg-background/80"
              />
            </div>
            <div className="space-y-3 rounded-2xl border border-border/40 bg-background/50 p-5">
              <div className="space-y-1">
                <p className="text-sm font-medium tracking-tight">{t('media.onlyfansTitle')}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{t('media.onlyfansHint')}</p>
              </div>
              <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={uploadMedia} />
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" className="h-9 rounded-xl" onClick={() => fileInputRef.current?.click()} disabled={uploadingMedia}>
                  {uploadingMedia ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('media.attachOnlyfans')}
                </Button>
                {mediaIds.map((id) => (
                  <Badge key={id} variant="secondary" className="gap-1 rounded-full font-mono text-[11px] font-normal">
                    {id.slice(0, 8)}…
                    <button
                      type="button"
                      aria-label={t('composer.removeMediaAria')}
                      className="opacity-70 hover:opacity-100"
                      onClick={() => setMediaIds((prev) => prev.filter((x) => x !== id))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-8 rounded-3xl border border-border/40 bg-card/40 p-6 backdrop-blur-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{t('launch.kicker')}</p>
              <h2 className="text-xl font-light tracking-tight">{t('launch.title')}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{t('launch.hint')}</p>
            </div>
            <Badge variant={hasEnoughForRunAll ? 'secondary' : 'destructive'} className="h-8 shrink-0 rounded-full px-3 font-normal" {...DASHBOARD_CREDIT_SUMMARY_MARK}>
              {creditSnapshotLoading
                ? t('launch.creditsLoading')
                : remainingCredits != null
                  ? t('launch.creditsLeft', { count: Math.floor(remainingCredits) })
                  : t('launch.creditsUnknown')}
            </Badge>
          </div>
          <div className="grid gap-3 rounded-2xl border border-border/40 bg-background/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('launch.rowAudience')}</p>
              <p className="text-lg font-light tabular-nums">{runAllCost.audienceSuggestion}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('launch.rowCaptions')}</p>
              <p className="text-lg font-light tabular-nums">{runAllCost.captionGeneration}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('launch.rowPpv')}</p>
              <p className="text-lg font-light tabular-nums">{runAllCost.priceGeneration}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('launch.rowSends')}</p>
              <p className="text-lg font-light tabular-nums">{runAllCost.send}</p>
            </div>
          </div>
          <div className="flex flex-col gap-4 border-t border-border/30 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-sky-600/80 dark:text-sky-400/80" />
              <span>
                {t('launch.estimateLabel')}: <span className="font-medium text-foreground">{runAllCost.total}</span>
              </span>
            </div>
            <Button
              type="button"
              size="lg"
              className="h-11 min-w-[12rem] rounded-xl px-8 font-medium shadow-sm"
              onClick={() => void sendCampaign()}
              disabled={sending || selectedFans.length === 0 || !hasEnoughForRunAll}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? t('launch.sending') : t('launch.cta')}
            </Button>
          </div>
          {!hasEnoughForRunAll ? <p className="text-sm leading-relaxed text-destructive">{t('launch.insufficient')}</p> : null}
        </section>
      </div>
    </div>
  )
}
