'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
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
import { Switch } from '@/components/ui/switch'
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

type VaultVideoRow = {
  id: string
  title: string | null
  content_type: string
  file_url: string | null
  vault_storage_path?: string | null
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
  const [captionTone, setCaptionTone] = useState('warm, premium, confident')
  const [captionCta, setCaptionCta] = useState('Reply now and I will unlock this for you')
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
    trace?: { generated: number; failed: number }
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mediaIds, setMediaIds] = useState<string[]>([])
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [traceEnabled, setTraceEnabled] = useState(false)
  const [traceRecipientKeyPrefix, setTraceRecipientKeyPrefix] = useState('mass')
  const [traceVaultRows, setTraceVaultRows] = useState<VaultVideoRow[]>([])
  const [traceVaultLoading, setTraceVaultLoading] = useState(false)
  const [selectedTraceContentIds, setSelectedTraceContentIds] = useState<string[]>([])
  const [creditSnapshot, setCreditSnapshot] = useState<CreditSnapshot | null>(null)
  const [creditSnapshotLoading, setCreditSnapshotLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (!traceEnabled) return
    let cancelled = false
    setTraceVaultLoading(true)
    void (async () => {
      try {
        const res = await fetch('/api/content/vault', { credentials: 'include' })
        const data = (await res.json().catch(() => ({}))) as { items?: VaultVideoRow[] }
        if (!res.ok || cancelled) return
        const rows = Array.isArray(data.items) ? data.items : []
        const videos = rows.filter((r) => r.content_type === 'video' && (r.file_url || r.vault_storage_path))
        if (cancelled) return
        setTraceVaultRows(videos)
        if (videos.length > 0 && selectedTraceContentIds.length === 0) {
          setSelectedTraceContentIds([videos[0].id])
        }
      } finally {
        if (!cancelled) setTraceVaultLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [traceEnabled, selectedTraceContentIds.length])

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
  const selectedOnlyFansFans = useMemo(
    () => selectedFans.filter((fan) => fan.platform === 'onlyfans'),
    [selectedFans],
  )

  const selectionStats = useMemo(() => {
    const byPlatform = { onlyfans: 0, fansly: 0 }
    for (const fan of selectedFans) byPlatform[fan.platform] += 1
    return byPlatform
  }, [selectedFans])

  const runAllCost = useMemo(
    () =>
      estimateMassCampaignCredits({
        recipientCount: selectedOnlyFansFans.length,
        traceEnabled,
        traceVideoCount: selectedTraceContentIds.length || 1,
        includeAudienceSuggestionRun: true,
        includeCaptionGenerationRun: selectedFans.length > 0,
        includePriceGenerationRun: selectedFans.length > 0,
        personalizedSend: true,
      }),
    [selectedOnlyFansFans.length, traceEnabled, selectedTraceContentIds.length, selectedFans.length],
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
      if (!res.ok) throw new Error(data.error || 'Could not suggest segments')
      setSegments(Array.isArray(data.segments) ? data.segments : [])
      setSelectedSegmentId(null)
    } catch (e) {
      setSegments([])
      setError(e instanceof Error ? e.message : 'Could not suggest segments')
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
      if (!res.ok) throw new Error(data.error || 'Could not suggest audience')
      const suggestions = Array.isArray(data.suggestions) ? data.suggestions : []
      setAudienceSuggestions(suggestions)
      const keys = suggestions
        .map((s) => fans.find((f) => f.id === s.fanId && f.platform === s.platform))
        .filter((f): f is FanRecord => f != null)
        .map((f) => fanKey(f))
      if (keys.length > 0) updateSelection(keys)
    } catch (e) {
      setAudienceSuggestions([])
      setError(e instanceof Error ? e.message : 'Audience suggestion failed')
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
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploadingMedia(false)
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
      if (!res.ok) throw new Error(data.error || 'Caption generation failed')
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
      setError(e instanceof Error ? e.message : 'Caption generation failed')
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
      if (!res.ok) throw new Error(data.error || 'PPV pricing failed')
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
      setError(e instanceof Error ? e.message : 'PPV pricing failed')
    } finally {
      setLoadingPrices(false)
    }
  }

  const sendCampaign = async () => {
    setError(null)
    setSendResult(null)
    if (selectedOnlyFansFans.length === 0) {
      setError('Select at least one OnlyFans fan to send personalized campaign messages.')
      return
    }
    const defaultNumericPrice = parsePriceInput(defaultPrice)
    const targets = selectedOnlyFansFans
      .map((fan) => {
        const key = fanKey(fan)
        const draft = perFanDrafts[key]
        const caption = (draft?.caption || baseMessage).trim()
        const price = parsePriceInput(draft?.price || '') ?? defaultNumericPrice
        if (!caption) return null
        return {
          platform: 'onlyfans' as const,
          fanId: fan.platformFanId,
          message: caption,
          price: price ?? undefined,
          username: fan.username,
          displayName: fan.displayName,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row != null)

    if (targets.length === 0) {
      setError('At least one selected fan needs a caption or base message before sending.')
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
          trace: traceEnabled
            ? {
                enabled: true,
                contentIds: selectedTraceContentIds,
                recipientKeyPrefix: traceRecipientKeyPrefix.trim() || undefined,
              }
            : undefined,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        success: boolean
        sent: number
        failed: number
        trace?: { generated: number; failed: number }
      }
      if (!res.ok) throw new Error(data.error || 'Campaign send failed')
      setSendResult({
        success: Boolean(data.success),
        sent: Number(data.sent ?? 0),
        failed: Number(data.failed ?? 0),
        trace: data.trace,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Campaign send failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-14 sm:p-6">
      <div className="rounded-2xl border border-border/80 bg-card/95 p-4 shadow-sm sm:p-5">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2 gap-1">
          <Link href="/dashboard/messages">
            <ArrowLeft className="h-4 w-4" />
            Back to inbox
          </Link>
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Mass campaign studio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select individual fans, let AI suggest the best cohort, generate per-fan caption and pricing, then launch personalized mass DMs.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Action failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {sendResult ? (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertTitle>Campaign executed</AlertTitle>
          <AlertDescription>
            Sent {sendResult.sent} message(s), failed {sendResult.failed}
            {sendResult.trace ? ` · traces ${sendResult.trace.generated} generated` : ''}.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 rounded-2xl border border-border bg-card/95 p-4 sm:p-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">1) Audience</p>
              <p className="text-xs text-muted-foreground">Manual multi-select, segment apply, or AI ranked suggestions.</p>
            </div>
            <Badge variant="secondary" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {selectedFans.length} selected
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={platformScope} onValueChange={(v: 'all' | 'onlyfans' | 'fansly') => setPlatformScope(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                <SelectItem value="onlyfans">OnlyFans only</SelectItem>
                <SelectItem value="fansly">Fansly only</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" placeholder="Search by username, id, label…" />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={selectAllFiltered}>
              Select filtered
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
          {crmWarnings.length > 0 ? (
            <p className="text-xs text-amber-600 dark:text-amber-500">{crmWarnings.join(' ')}</p>
          ) : null}
          <div className="max-h-[28rem] overflow-auto rounded-lg border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Fan</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Spent</TableHead>
                  <TableHead>Segment tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingFans ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading fans…
                      </div>
                    </TableCell>
                  </TableRow>
                ) : fansFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      {hasFanPlatformConnected ? 'No fans match this filter.' : 'Connect platforms and sync fans first.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  fansFiltered.slice(0, 500).map((fan) => {
                    const key = fanKey(fan)
                    const selected = selectedFanKeys.includes(key)
                    return (
                      <TableRow key={key} data-state={selected ? 'selected' : undefined}>
                        <TableCell>
                          <Checkbox checked={selected} onCheckedChange={() => toggleFanSelection(key)} aria-label={`Select ${fan.username}`} />
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

        <div className="space-y-4">
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Suggest segments (AI)</p>
            </div>
            <Input value={segmentGoal} onChange={(e) => setSegmentGoal(e.target.value)} placeholder="Goal: active buyers, retention risk, whales…" />
            <Button type="button" className="mt-2 w-full gap-2" variant="outline" onClick={() => void runSegments()} disabled={loadingSegments}>
              {loadingSegments ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Suggest segments ({getCreditsForToolId('mass-dm-audience-suggester')} credits)
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
                      <Badge variant={selectedSegmentId === segment.id ? 'default' : 'secondary'}>~{matched}</Badge>
                    </div>
                    <Button type="button" size="sm" variant="ghost" className="mt-1.5 h-7 px-2.5" onClick={() => applySegmentToSelection(segment)}>
                      Apply to selection
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">AI audience ranking</p>
            </div>
            <Input value={audienceGoal} onChange={(e) => setAudienceGoal(e.target.value)} placeholder="Goal: sell PPV bundle to highest intent fans" />
            <Input value={audienceTargetRevenue} onChange={(e) => setAudienceTargetRevenue(e.target.value)} className="mt-2" type="number" min={0} step={1} placeholder="Target revenue (optional)" />
            <Button type="button" className="mt-2 w-full gap-2" onClick={() => void runAudienceSuggestion()} disabled={loadingAudienceSuggest}>
              {loadingAudienceSuggest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
              Suggest best fans ({getCreditsForToolId('mass-dm-audience-suggester')} credits)
            </Button>
            {audienceSuggestions.length > 0 ? (
              <div className="mt-2 max-h-56 space-y-1 overflow-auto rounded-md border border-border/60 p-2">
                {audienceSuggestions.map((item) => {
                  const fan = fans.find((f) => f.id === item.fanId && f.platform === item.platform)
                  return (
                    <div key={`${item.platform}:${item.fanId}`} className="rounded-md border border-border/50 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium">{fan ? `@${fan.username}` : item.fanId}</p>
                        <Badge variant="outline">{item.score}/100</Badge>
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

      <section className="space-y-4 rounded-2xl border border-border bg-card/95 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">2) Campaign copy, pricing, and traces</p>
            <p className="text-xs text-muted-foreground">Generate personalized captions and pricing per selected fan before launch.</p>
          </div>
          <Badge variant="secondary">
            OnlyFans {selectionStats.onlyfans} · Fansly {selectionStats.fansly}
          </Badge>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.25fr_1fr]">
          <div className="space-y-2">
            <Label>Base campaign angle</Label>
            <Textarea value={baseMessage} onChange={(e) => setBaseMessage(e.target.value)} placeholder="Describe what you are selling and why now…" className="min-h-28" />
          </div>
          <div className="space-y-2">
            <Label>Default PPV price (optional)</Label>
            <Input value={defaultPrice} onChange={(e) => setDefaultPrice(e.target.value)} type="number" min={0} step={0.01} placeholder="e.g. 19.99" />
            <Label className="mt-2">Caption tone</Label>
            <Input value={captionTone} onChange={(e) => setCaptionTone(e.target.value)} />
            <Label className="mt-2">Call to action</Label>
            <Input value={captionCta} onChange={(e) => setCaptionCta(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void generateCaptions()} disabled={loadingCaptions || selectedFans.length === 0} className="gap-2">
            {loadingCaptions ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate per-fan captions ({getCreditsForToolId('mass-dm-fan-captions')} credits)
          </Button>
          <Input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} type="number" min={0} step={0.01} className="w-24" placeholder="Min" />
          <Input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} type="number" min={0} step={0.01} className="w-24" placeholder="Max" />
          <Input value={expectedRevenue} onChange={(e) => setExpectedRevenue(e.target.value)} type="number" min={0} step={1} className="w-36" placeholder="Target $" />
          <Button type="button" variant="outline" onClick={() => void generatePrices()} disabled={loadingPrices || selectedFans.length === 0} className="gap-2">
            {loadingPrices ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
            Optimize PPV ({getCreditsForToolId('mass-dm-ppv-pricing')} credits)
          </Button>
        </div>

        <div className="max-h-[22rem] overflow-auto rounded-lg border border-border/70">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fan</TableHead>
                <TableHead>Caption</TableHead>
                <TableHead className="w-28">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedFans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">Select fans above to edit per-recipient caption and pricing.</TableCell>
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
                          placeholder={baseMessage || 'Type custom caption for this fan'}
                          className="min-h-20"
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

        <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Media and Ariadne traces</p>
              <p className="text-xs text-muted-foreground">
                Personalized send supports one or many selected videos; trace runs per fan x per video.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="trace-enabled" className="text-xs">Trace</Label>
              <Switch id="trace-enabled" checked={traceEnabled} onCheckedChange={setTraceEnabled} />
            </div>
          </div>
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={uploadMedia} />
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingMedia}>
              {uploadingMedia ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Attach media (OnlyFans)
            </Button>
            {mediaIds.map((id) => (
              <Badge key={id} variant="secondary" className="gap-1">
                {id.slice(0, 8)}…
                <button type="button" onClick={() => setMediaIds((prev) => prev.filter((x) => x !== id))}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          {traceEnabled ? (
            <div className="space-y-2">
              <Input value={traceRecipientKeyPrefix} onChange={(e) => setTraceRecipientKeyPrefix(e.target.value)} placeholder="Trace key prefix (e.g. mass)" />
              <div className="max-h-40 overflow-auto rounded-md border border-border/70 p-2">
                {traceVaultLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading vault videos…
                  </div>
                ) : traceVaultRows.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No vault videos found. Add one in Media & vault first.</p>
                ) : (
                  traceVaultRows.map((row) => {
                    const checked = selectedTraceContentIds.includes(row.id)
                    return (
                      <label key={row.id} className="flex items-center gap-2 py-1.5 text-xs">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() =>
                            setSelectedTraceContentIds((prev) =>
                              checked ? prev.filter((id) => id !== row.id) : [...prev, row.id],
                            )
                          }
                        />
                        <span>{row.title || row.id}</span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/95 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">3) Credits and launch</p>
            <p className="text-xs text-muted-foreground">Transparent cost before execution.</p>
          </div>
          <Badge variant={hasEnoughForRunAll ? 'secondary' : 'destructive'} {...DASHBOARD_CREDIT_SUMMARY_MARK}>
            {creditSnapshotLoading ? 'Loading credits…' : remainingCredits != null ? `${Math.floor(remainingCredits)} credits left` : 'Credit snapshot unavailable'}
          </Badge>
        </div>
        <div className="mt-3 grid gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="text-xs text-muted-foreground">Suggest audience</p>
            <p className="font-medium">{runAllCost.audienceSuggestion}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Generate captions</p>
            <p className="font-medium">{runAllCost.captionGeneration}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Optimize PPV</p>
            <p className="font-medium">{runAllCost.priceGeneration}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Personalized sends</p>
            <p className="font-medium">{runAllCost.send}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ariadne traces</p>
            <p className="font-medium">{runAllCost.trace}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-primary" />
            Estimated full run total: <span className="font-semibold">{runAllCost.total} credits</span>
          </div>
          <Button
            type="button"
            size="lg"
            onClick={() => void sendCampaign()}
            disabled={sending || selectedOnlyFansFans.length === 0 || !hasEnoughForRunAll}
            className="gap-2"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send personalized campaign
          </Button>
        </div>
        {!hasEnoughForRunAll ? (
          <p className="mt-2 text-xs text-destructive">
            Insufficient credits for the full workflow estimate. Reduce audience size, disable traces, or top up credits.
          </p>
        ) : null}
      </section>
    </div>
  )
}
