'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2, RefreshCw } from 'lucide-react'
import { proxyImageUrl } from '@/lib/proxy-image-url'
import type { UnifiedFanProfilePayload } from '@/lib/divine/fan-profile-server'
import { audienceMetaWithProfileOverride } from '@/lib/fans/merge-fan-audience'
import {
  FanProfileTypeSelect,
  type AudienceProfileValue,
} from '@/components/fans/fan-profile-type-select'
import { PlatformLogoChip } from '@/components/messages/platform-logo-chip'
import { cn } from '@/lib/utils'
import type { FanProfileType } from '@/lib/fans/profile-types'

type FanProfileModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  fanId: string
  platform?: 'onlyfans' | 'fansly'
  /** Shown while loading before API returns */
  initialUsername?: string | null
  initialName?: string | null
  initialAvatar?: string | null
}

function formatProfileSection(profileJson: unknown): { label: string; items: string[] }[] {
  if (!profileJson || typeof profileJson !== 'object') return []
  const o = profileJson as Record<string, unknown>
  const keys: Array<{ key: string; label: string }> = [
    { key: 'preferences', label: 'Preferences' },
    { key: 'interests', label: 'Interests' },
    { key: 'hobbies', label: 'Hobbies' },
    { key: 'travel_plans', label: 'Travel' },
    { key: 'content_requests', label: 'Content requests' },
  ]
  const out: { label: string; items: string[] }[] = []
  for (const { key, label } of keys) {
    const v = o[key]
    if (Array.isArray(v)) {
      const items = v.map((x) => String(x)).filter(Boolean)
      if (items.length) out.push({ label, items })
    }
  }
  if (typeof o.relationship_notes === 'string' && o.relationship_notes.trim()) {
    out.push({ label: 'Relationship notes', items: [o.relationship_notes.trim()] })
  }
  if (typeof o.tone === 'string' && o.tone.trim()) {
    out.push({ label: 'Tone', items: [o.tone.trim()] })
  }
  return out
}

function threadInsightMetaLine(ti: {
  lastThreadRefreshAt?: string | null
  lastScanKind?: string | null
  lastScanAt?: string | null
  lastUpdateAt?: string | null
}): string | null {
  const parts: string[] = []
  if (ti.lastThreadRefreshAt) {
    parts.push(`Refreshed ${new Date(ti.lastThreadRefreshAt).toLocaleString()}`)
  }
  if (ti.lastScanKind && ti.lastScanAt) {
    const kind = ti.lastScanKind === 'thread_update' ? 'Thread update' : 'Manual scan'
    parts.push(`${kind} · ${new Date(ti.lastScanAt).toLocaleString()}`)
  } else if (ti.lastScanAt) {
    parts.push(`Scan ${new Date(ti.lastScanAt).toLocaleString()}`)
  }
  if (ti.lastUpdateAt) {
    parts.push(`Auto-update ${new Date(ti.lastUpdateAt).toLocaleString()}`)
  }
  if (parts.length === 0) return null
  return parts.join(' · ')
}

export function FanProfileModal({
  open,
  onOpenChange,
  fanId,
  platform = 'onlyfans',
  initialUsername,
  initialName,
  initialAvatar,
}: FanProfileModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<UnifiedFanProfilePayload | null>(null)
  const [classificationDraft, setClassificationDraft] = useState('')
  const [savingClass, setSavingClass] = useState(false)
  const [enrichAboutLoading, setEnrichAboutLoading] = useState(false)
  const [treatFanSaving, setTreatFanSaving] = useState(false)
  const [profileTypeSaving, setProfileTypeSaving] = useState(false)

  const load = useCallback(async () => {
    if (!fanId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/divine/fan-profile?fanId=${encodeURIComponent(fanId)}&platform=${encodeURIComponent(platform)}`,
        { credentials: 'include' },
      )
      const json = (await res.json().catch(() => ({}))) as UnifiedFanProfilePayload & { error?: string }
      if (!res.ok) throw new Error(json.error || 'Failed to load profile')
      setData(json)
      setClassificationDraft(json.creatorClassification ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [fanId, platform])

  useEffect(() => {
    if (!open || !fanId) return
    void load()
  }, [open, fanId, load])

  const displayName =
    data?.core?.displayName || initialName || data?.core?.username || initialUsername || 'Fan'
  const username = data?.core?.username || initialUsername || '—'
  const avatar = data?.core?.avatarUrl || initialAvatar || ''

  const audienceBadges = useMemo(() => {
    if (!data?.creatorDetector) return []
    const tier = data.crm?.subscriptionTier || 'regular'
    return audienceMetaWithProfileOverride(
      data.audienceProfileOverride ?? null,
      data.crm?.totalSpent ?? 0,
      tier,
      data.creatorDetector.is_creator_likely,
    ).badges
  }, [data])

  const effectiveProfileType = useMemo(
    () => ((data?.audienceProfileOverride ?? data?.profileType ?? 'fan') as FanProfileType) as AudienceProfileValue,
    [data?.audienceProfileOverride, data?.profileType],
  )

  const fansCrmHref = `/dashboard/fans?platform=${encodeURIComponent(platform)}&q=${encodeURIComponent(username)}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[min(92dvh,900px)] w-[min(100vw-1.25rem,52rem)] gap-0 overflow-y-auto rounded-[1.25rem] border border-white/40 bg-white/78 p-0 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur-2xl backdrop-saturate-150 sm:max-w-[52rem]',
          'dark:border-white/[0.09] dark:bg-slate-950/65 dark:shadow-[0_32px_90px_-36px_rgba(0,0,0,0.55)]',
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Fan profile</DialogTitle>
          <DialogDescription>Fan id, platform, thread insights, and AI summary</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col px-5 pb-8 pt-6 sm:px-8 sm:pb-10 sm:pt-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
            <Avatar className="h-[5.25rem] w-[5.25rem] shrink-0 rounded-2xl ring-1 ring-black/[0.06] dark:ring-white/[0.08]">
              <AvatarImage src={proxyImageUrl(avatar) || avatar || undefined} />
              <AvatarFallback className="rounded-2xl bg-muted/40 text-2xl font-semibold text-foreground/80">
                {displayName[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/55">Fan profile</p>
                  <h2 className="truncate text-[1.625rem] font-semibold leading-tight tracking-[-0.03em] text-foreground">
                    {displayName}
                  </h2>
                  <p className="truncate text-[15px] text-muted-foreground/88">@{username}</p>
                  <p className="pt-1">
                    <Link
                      href={fansCrmHref}
                      className="text-[12px] font-medium text-muted-foreground underline decoration-border/55 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/35"
                    >
                      Open in Fans
                    </Link>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-xl border-border/40 bg-background/40 shadow-none"
                  title="Sync thread from platform, then reload"
                  onClick={async () => {
                    setError(null)
                    setLoading(true)
                    try {
                      const sync = await fetch('/api/divine/refresh-thread-insight', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ fanId, platform, force: true }),
                      })
                      const syncJson = (await sync.json().catch(() => ({}))) as { error?: string }
                      if (!sync.ok) throw new Error(syncJson.error || 'Could not sync thread')
                      await load()
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Sync failed')
                      setLoading(false)
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border/35 bg-background/35 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                  ID {fanId}
                </span>
                <PlatformLogoChip platform={platform} />
                {audienceBadges.map((b) => (
                  <Badge
                    key={b.key}
                    variant="outline"
                    className={cn(
                      'border-border/40 bg-transparent text-[11px] font-medium text-foreground/85',
                      b.className,
                    )}
                  >
                    {b.label}
                    {b.key === 'creator' && data?.creatorDetector?.confidence != null
                      ? ` · ${Math.round((data.creatorDetector.confidence || 0) * 100)}%`
                      : null}
                  </Badge>
                ))}
              </div>

              {(data?.creatorClassification?.trim() || data?.crm?.fanTenureDays != null) && (
                <div className="border-l-2 border-l-violet-500/35 py-1 pl-4 dark:border-l-violet-400/30">
                  {data?.creatorClassification?.trim() ? (
                    <p className="text-[13px] leading-snug text-foreground">
                      <span className="text-muted-foreground/80">Your label · </span>
                      {data.creatorClassification.trim()}
                    </p>
                  ) : null}
                  {data?.crm?.fanTenureDays != null ? (
                    <p className={cn('text-[13px] leading-snug text-foreground/90', data?.creatorClassification?.trim() && 'mt-2')}>
                      <span className="text-muted-foreground/80">Tenure · </span>
                      {data.crm.fanTenureDays === 0
                        ? 'joined today'
                        : data.crm.fanTenureDays < 14
                          ? `${data.crm.fanTenureDays} days`
                          : data.crm.fanTenureDays < 365
                            ? `${Math.floor(data.crm.fanTenureDays / 7)} weeks`
                            : `${Math.floor(data.crm.fanTenureDays / 30)} months`}
                      {data.crm.subscriptionStart ? (
                        <span className="text-muted-foreground/75">
                          {' '}
                          · since {new Date(data.crm.subscriptionStart).toLocaleDateString()}
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/65">
                  CRM profile type
                </Label>
                <p className="text-[12px] leading-snug text-muted-foreground/82">
                  Override replaces inferred classification until you clear it in CRM.
                </p>
                <FanProfileTypeSelect
                  value={effectiveProfileType}
                  disabled={profileTypeSaving || loading || !fanId}
                  onChange={async (v) => {
                    if (!data) return
                    const prev = data
                    const optimistic = {
                      ...data,
                      audienceProfileOverride: v,
                      profileType: v,
                      profileTypeSource: 'manual' as const,
                      profileTypeReason: 'Manual override has priority',
                    }
                    setData(optimistic)
                    setProfileTypeSaving(true)
                    setError(null)
                    try {
                      const res = await fetch('/api/divine/fan-profile', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                          fanId,
                          platform,
                          audience_profile_override: v,
                        }),
                      })
                      const json = (await res.json().catch(() => ({}))) as UnifiedFanProfilePayload & {
                        error?: string
                      }
                      if (!res.ok) throw new Error(json.error || 'Failed to save profile type')
                      setData(json)
                    } catch (e) {
                      setData(prev)
                      setError(e instanceof Error ? e.message : 'Save failed')
                    } finally {
                      setProfileTypeSaving(false)
                    }
                  }}
                  className="w-full"
                />
                {data ? (
                  <p className="text-[11px] text-muted-foreground/80">
                    Applied ·{' '}
                    <span className="font-medium text-foreground/90">{effectiveProfileType.replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground/50"> · </span>
                    <span className="uppercase tracking-[0.08em] text-muted-foreground/70">{data.profileTypeSource}</span>
                  </p>
                ) : null}
              </div>

              {data?.crm != null && (
                <p className="text-[12px] leading-snug text-muted-foreground/85">
                  ${Math.round(data.crm.totalSpent)} spent
                  {data.crm.subscriptionTier ? ` · ${data.crm.subscriptionTier}` : ''}
                  {data.crm.subscriptionAccountType && data.crm.subscriptionAccountType !== 'unknown'
                    ? ` · ${data.crm.subscriptionAccountType === 'free' ? 'free' : 'paid'}`
                    : ''}
                  {data.crm.subscriptionPrice != null && !Number.isNaN(data.crm.subscriptionPrice)
                    ? ` · list $${data.crm.subscriptionPrice.toFixed(2)}`
                    : ''}
                </p>
              )}
              {data?.churnSnapshot ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 dark:border-amber-400/15 dark:bg-amber-400/[0.05]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">Churn</p>
                  <p className="mt-1.5 text-[13px] text-foreground">
                    <span className="capitalize">{data.churnSnapshot.riskLevel}</span>
                    {data.churnSnapshot.updatedAt
                      ? (
                          <span className="text-muted-foreground/75">
                            {' '}
                            · {new Date(data.churnSnapshot.updatedAt).toLocaleString()}
                          </span>
                        )
                      : null}
                  </p>
                  {data.churnSnapshot.oneLine ? (
                    <p className="mt-2 text-[12px] leading-relaxed text-foreground/88">{data.churnSnapshot.oneLine}</p>
                  ) : null}
                  <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
                    <Link
                      href="/dashboard/retention/churn"
                      className="font-medium text-foreground underline decoration-border/60 underline-offset-4 transition-colors hover:decoration-foreground/40"
                    >
                      Retention
                    </Link>
                    <Link
                      href="/dashboard/ai-studio/tools/churn-predictor"
                      className="font-medium text-foreground underline decoration-border/60 underline-offset-4 transition-colors hover:decoration-foreground/40"
                    >
                      Churn predictor
                    </Link>
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {loading && !data && (
            <div className="mt-8 flex items-center gap-2.5 text-[13px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin opacity-80" />
              Loading profile…
            </div>
          )}
          {error ? <p className="mt-4 text-[13px] text-destructive">{error}</p> : null}

          <div className="mt-10 space-y-3 border-t border-border/25 pt-8 dark:border-white/[0.06]">
            <Label htmlFor="fan-creator-classification" className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/65">
              Your label
            </Label>
            <p className="max-w-prose text-[12px] leading-relaxed text-muted-foreground/85">
              Private tags for you and Divine — whale, VIP, churn risk, fellow creator, etc.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <Input
                id="fan-creator-classification"
                value={classificationDraft}
                onChange={(e) => setClassificationDraft(e.target.value)}
                placeholder="Optional"
                className="h-10 flex-1 rounded-xl border-border/40 bg-background/50 text-[13px] shadow-none"
                disabled={savingClass || loading}
                maxLength={2000}
              />
              <Button
                type="button"
                size="sm"
                className="h-10 shrink-0 rounded-xl px-5 text-[13px] font-semibold"
                disabled={savingClass || loading || !fanId}
                onClick={async () => {
                  setSavingClass(true)
                  setError(null)
                  try {
                    const res = await fetch('/api/divine/fan-profile', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        fanId,
                        platform,
                        creator_classification: classificationDraft.trim() || null,
                      }),
                    })
                    const json = (await res.json().catch(() => ({}))) as UnifiedFanProfilePayload & {
                      error?: string
                    }
                    if (!res.ok) throw new Error(json.error || 'Save failed')
                    setData(json)
                    setClassificationDraft(json.creatorClassification ?? '')
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Save failed')
                  } finally {
                    setSavingClass(false)
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>

          {platform === 'onlyfans' && data && (
            <div className="mt-10 space-y-4 border-t border-border/25 pt-8 dark:border-white/[0.06]">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/65">OnlyFans bio</p>
                <p className="mt-2 max-w-prose text-[12px] leading-snug text-muted-foreground/85">
                  Feeds creator detection: official API when possible; otherwise general web snippets (best-effort). Cached ~24h.
                </p>
              </div>
              {data.platformAboutSource !== 'none' ? (
                <p className="text-[11px] text-muted-foreground/75">
                  {data.platformAboutSource === 'of_api' ? 'OnlyFans API' : 'Web snippet fallback'} · {data.platformAboutFreshness}
                </p>
              ) : null}
              {data.platformAbout?.trim() ? (
                <p className="max-h-[min(40vh,18rem)] overflow-auto rounded-xl border border-border/25 bg-muted/15 px-4 py-3 text-[12px] leading-relaxed whitespace-pre-wrap text-foreground/88 dark:border-white/[0.06]">
                  {data.platformAbout}
                </p>
              ) : (
                <p className="text-[12px] text-muted-foreground/80">No bio stored yet.</p>
              )}
              {data.platformAboutFetchedAt ? (
                <p className="text-[11px] text-muted-foreground/65">
                  Fetched {new Date(data.platformAboutFetchedAt).toLocaleString()}
                </p>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 rounded-xl border-border/40 text-[13px] font-medium"
                disabled={enrichAboutLoading || loading || !fanId}
                onClick={async () => {
                  setEnrichAboutLoading(true)
                  setError(null)
                  try {
                    const res = await fetch('/api/onlyfans/fans/enrich-about', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ fanId, force: true }),
                    })
                    const json = (await res.json().catch(() => ({}))) as { error?: string }
                    if (!res.ok) throw new Error(json.error || 'Fetch failed')
                    await load()
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Enrich failed')
                  } finally {
                    setEnrichAboutLoading(false)
                  }
                }}
              >
                {enrichAboutLoading ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Fetching…
                  </>
                ) : (
                  'Refresh bio'
                )}
              </Button>
              <div className="flex items-start justify-between gap-4 border-t border-border/20 pt-6 dark:border-white/[0.06]">
                <div className="min-w-0 space-y-1">
                  <Label htmlFor="treat-as-fan-auto" className="text-[13px] font-medium text-foreground/90">
                    Treat as fan for automation
                  </Label>
                  <p className="text-[12px] leading-relaxed text-muted-foreground/85">
                    Run AI chatter and comment tools even when they look like a fellow creator.
                  </p>
                </div>
                <Switch
                  id="treat-as-fan-auto"
                  checked={data.treatAsFanForAutomation === true}
                  disabled={treatFanSaving || loading}
                  onCheckedChange={async (checked) => {
                    setTreatFanSaving(true)
                    setError(null)
                    try {
                      const res = await fetch('/api/divine/fan-profile', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                          fanId,
                          platform,
                          treat_as_fan_for_automation: checked,
                        }),
                      })
                      const json = (await res.json().catch(() => ({}))) as UnifiedFanProfilePayload & {
                        error?: string
                      }
                      if (!res.ok) throw new Error(json.error || 'Update failed')
                      setData(json)
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Update failed')
                    } finally {
                      setTreatFanSaving(false)
                    }
                  }}
                />
              </div>
            </div>
          )}

          {data?.skipExpensiveAiForCreatorLikely &&
            data.creatorDetector?.is_creator_likely &&
            !data.treatAsFanForAutomation && (
              <p className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-[12px] leading-relaxed text-foreground/90 dark:border-amber-400/15">
                Expensive AI is off for likely creators. Turn on “Treat as fan for automation” or add a fan-style label
                to keep automations.
              </p>
            )}

          {data?.creatorDetector && (
            <div
              className={cn(
                'mt-10 space-y-2 border-t border-border/25 pt-8 dark:border-white/[0.06]',
                'rounded-xl border border-border/30 bg-muted/10 px-4 py-4 dark:border-white/[0.06]',
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    data.creatorDetector.is_creator_likely ? 'bg-amber-500/90' : 'bg-emerald-500/80',
                  )}
                  aria-hidden
                />
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/65">
                  Creator signal
                </p>
              </div>
              <p className="text-[14px] font-medium leading-snug tracking-[-0.01em] text-foreground">
                {data.creatorDetector.is_creator_likely
                  ? 'May also create or promote a page.'
                  : 'No strong creator-style signals in stored text.'}
              </p>
              {data.creatorDetector.rationale_snippets.length > 0 ? (
                <ul className="mt-3 list-disc space-y-1.5 border-t border-border/15 py-3 pl-4 text-[12px] leading-relaxed text-muted-foreground/88 dark:border-white/[0.05]">
                  {data.creatorDetector.rationale_snippets.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}

          {data?.threadInsight?.profileJson != null &&
            formatProfileSection(data.threadInsight.profileJson).length > 0 && (
              <div className="mt-10 space-y-6 border-t border-border/25 pt-8 dark:border-white/[0.06]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/65">From thread</p>
                {formatProfileSection(data.threadInsight.profileJson).map((block) => (
                  <div key={block.label}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/55">
                      {block.label}
                    </p>
                    <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-foreground/88">
                      {block.items.map((line) => (
                        <li key={line} className="flex gap-2">
                          <span className="text-muted-foreground/40">·</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

          {data?.aiSummary?.summaryJson != null && (
            <div className="mt-10 space-y-3 border-t border-border/25 pt-8 dark:border-white/[0.06]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/65">AI summary</p>
              <pre className="max-h-[min(50vh,28rem)] overflow-auto rounded-xl border border-border/25 bg-muted/10 p-4 text-[11px] leading-relaxed whitespace-pre-wrap break-words text-foreground/85 dark:border-white/[0.06]">
                {JSON.stringify(data.aiSummary.summaryJson, null, 2)}
              </pre>
              {data.aiSummary.lastAnalyzedAt ? (
                <p className="text-[11px] text-muted-foreground/70">
                  {new Date(data.aiSummary.lastAnalyzedAt).toLocaleString()}
                </p>
              ) : null}
            </div>
          )}

          {data?.threadInsight?.threadSnapshotExcerpt && (
            <div className="mt-10 space-y-3 border-t border-border/25 pt-8 dark:border-white/[0.06]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/65">Thread excerpt</p>
              <p className="max-h-[min(50vh,28rem)] overflow-auto rounded-xl border border-border/25 bg-muted/10 p-4 text-[12px] leading-relaxed whitespace-pre-wrap text-muted-foreground/88 dark:border-white/[0.06]">
                {data.threadInsight.threadSnapshotExcerpt}
              </p>
              {(() => {
                const meta = threadInsightMetaLine(data.threadInsight!)
                return meta ? (
                  <p className="text-[11px] leading-snug text-muted-foreground/72">{meta}</p>
                ) : null
              })()}
            </div>
          )}

          {data?.threadInsight?.insufficientData && (
            <div className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 dark:border-amber-400/15">
              <p className="text-[13px] font-medium text-foreground">Profile still forming</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground/88">
                {data.threadInsight.insufficientDataReason ??
                  'Not enough conversation yet. Chat more, then run Scan again.'}
              </p>
            </div>
          )}

          {!loading && data && !data.threadInsight && !data.aiSummary?.summaryJson && (
            <p className="mt-10 max-w-prose border-t border-border/25 pt-8 text-[13px] leading-relaxed text-muted-foreground/85 dark:border-white/[0.06]">
              No thread insight yet. Sync from the header, run Scan in Divine AI, or send a message in chat.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
