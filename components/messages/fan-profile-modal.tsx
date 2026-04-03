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
import { cn } from '@/lib/utils'

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="sr-only">Fan profile</DialogTitle>
          <DialogDescription className="sr-only">
            Fan id, platform, thread insights, and AI summary
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20 border border-border">
              <AvatarImage src={proxyImageUrl(avatar) || avatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-2xl text-primary">
                {displayName[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-lg font-semibold">{displayName}</p>
              <p className="truncate text-sm text-muted-foreground">@{username}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="tabular-nums text-xs">
                  ID {fanId}
                </Badge>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                    platform === 'onlyfans' ? 'bg-sky-500/10 text-sky-600' : 'bg-blue-500/10 text-blue-600',
                  )}
                >
                  {platform === 'onlyfans' ? 'OnlyFans' : 'Fansly'}
                </span>
                {audienceBadges.map((b) => (
                  <Badge key={b.key} variant="outline" className={cn('text-[10px] font-medium', b.className)}>
                    {b.label}
                    {b.key === 'creator' && data?.creatorDetector?.confidence != null
                      ? ` (${Math.round((data.creatorDetector.confidence || 0) * 100)}%)`
                      : null}
                  </Badge>
                ))}
              </div>
              {(data?.creatorClassification?.trim() || data?.crm?.fanTenureDays != null) && (
                <div className="rounded-md border border-violet-500/25 bg-violet-500/5 px-2.5 py-2 text-xs">
                  {data?.creatorClassification?.trim() ? (
                    <p className="font-medium text-foreground">
                      <span className="text-muted-foreground">Your label: </span>
                      {data.creatorClassification.trim()}
                    </p>
                  ) : null}
                  {data?.crm?.fanTenureDays != null ? (
                    <p className={cn('text-foreground', data?.creatorClassification?.trim() && 'mt-1')}>
                      <span className="text-muted-foreground">Fan tenure: </span>
                      {data.crm.fanTenureDays === 0
                        ? 'joined today'
                        : data.crm.fanTenureDays < 14
                          ? `${data.crm.fanTenureDays} days`
                          : data.crm.fanTenureDays < 365
                            ? `${Math.floor(data.crm.fanTenureDays / 7)} weeks`
                            : `${Math.floor(data.crm.fanTenureDays / 30)} months`}
                      {data.crm.subscriptionStart ? (
                        <span className="ml-1.5 text-muted-foreground">
                          (since {new Date(data.crm.subscriptionStart).toLocaleDateString()})
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                </div>
              )}
              <div className="space-y-1.5 rounded-md border border-border bg-muted/25 p-2.5">
                <Label className="text-[11px] font-medium">CRM profile type</Label>
                <p className="text-[10px] text-muted-foreground">
                  Same control as Fans — overrides auto whale / creator signals for this thread.
                </p>
                <FanProfileTypeSelect
                  value={(data?.audienceProfileOverride ?? 'auto') as AudienceProfileValue}
                  disabled={profileTypeSaving || loading || !fanId}
                  onChange={async (v) => {
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
                          audience_profile_override: v === 'auto' ? null : v,
                        }),
                      })
                      const json = (await res.json().catch(() => ({}))) as UnifiedFanProfilePayload & {
                        error?: string
                      }
                      if (!res.ok) throw new Error(json.error || 'Failed to save profile type')
                      setData(json)
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Save failed')
                    } finally {
                      setProfileTypeSaving(false)
                    }
                  }}
                  className="w-full max-w-[260px]"
                />
              </div>

              {data?.crm != null && (
                <p className="text-[11px] text-muted-foreground">
                  Recorded spend: ${Math.round(data.crm.totalSpent)}
                  {data.crm.subscriptionTier ? ` · synced tier ${data.crm.subscriptionTier}` : ''}
                  {data.crm.subscriptionAccountType && data.crm.subscriptionAccountType !== 'unknown'
                    ? ` · ${data.crm.subscriptionAccountType === 'free' ? 'free-page follower' : 'paid sub'}`
                    : ''}
                  {data.crm.subscriptionPrice != null && !Number.isNaN(data.crm.subscriptionPrice)
                    ? ` (list $${data.crm.subscriptionPrice.toFixed(2)})`
                    : ''}
                </p>
              )}
              {data?.churnSnapshot ? (
                <div className="rounded-md border border-amber-500/35 bg-amber-500/5 px-2.5 py-2 text-xs">
                  <p className="font-medium text-foreground">Churn signal</p>
                  <p className="mt-0.5 text-muted-foreground">
                    <span className="capitalize text-foreground">{data.churnSnapshot.riskLevel}</span>
                    {data.churnSnapshot.updatedAt
                      ? ` · ${new Date(data.churnSnapshot.updatedAt).toLocaleString()}`
                      : ''}
                  </p>
                  {data.churnSnapshot.oneLine ? (
                    <p className="mt-1 text-[11px] leading-snug text-foreground/90">{data.churnSnapshot.oneLine}</p>
                  ) : null}
                  <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[11px]">
                    <Link href="/dashboard/retention/churn" className="text-violet-600 underline hover:text-violet-500">
                      Retention hub
                    </Link>
                    <span className="text-muted-foreground">·</span>
                    <Link
                      href="/dashboard/ai-studio/tools/churn-predictor"
                      className="text-violet-600 underline hover:text-violet-500"
                    >
                      Full churn run (2 credits)
                    </Link>
                  </p>
                </div>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Sync stored thread from platform, then reload"
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

          {loading && !data && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading profile…
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
            <Label htmlFor="fan-creator-classification" className="text-xs font-medium">
              Your label (optional)
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Private tags for you and Divine — e.g. fan, whale, VIP, churn risk, fellow creator. Fan-style labels keep
              automations on even when heuristics guess &quot;creator&quot;.
            </p>
            <div className="flex gap-2">
              <Input
                id="fan-creator-classification"
                value={classificationDraft}
                onChange={(e) => setClassificationDraft(e.target.value)}
                placeholder="Empty by default"
                className="text-sm"
                disabled={savingClass || loading}
                maxLength={2000}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
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
            <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
              <p className="text-xs font-medium">Platform bio (OnlyFans)</p>
              <p className="text-[11px] text-muted-foreground">
                When the API returns their about text, we use it for creator detection. Fetch sparingly (cached ~24h).
              </p>
              {data.platformAbout?.trim() ? (
                <p className="max-h-28 overflow-auto rounded-md bg-muted/40 p-2 text-xs whitespace-pre-wrap text-muted-foreground">
                  {data.platformAbout}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">No stored bio yet — fetch from OnlyFans if available.</p>
              )}
              {data.platformAboutFetchedAt && (
                <p className="text-[11px] text-muted-foreground">
                  Last fetched: {new Date(data.platformAboutFetchedAt).toLocaleString()}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
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
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Fetching…
                    </>
                  ) : (
                    'Refresh from OnlyFans'
                  )}
                </Button>
              </div>
              <div className="flex items-start justify-between gap-3 border-t border-border pt-3">
                <div className="min-w-0 space-y-0.5">
                  <Label htmlFor="treat-as-fan-auto" className="text-xs font-medium">
                    Treat as fan for automation
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    When on, AI Chatter and comment analysis run even if they look like a fellow creator.
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
              <p className="rounded-md border border-amber-500/35 bg-amber-500/10 p-2 text-[11px] text-amber-100/95">
                Divine is set to skip expensive AI for likely creators. Turn on &quot;Treat as fan for automation&quot;
                or use a fan-style label (e.g. whale, churn risk) to keep automations for this person.
              </p>
            )}

          {data?.creatorDetector && (
            <div
              className={cn(
                'rounded-md border p-3 text-sm',
                data.creatorDetector.is_creator_likely
                  ? 'border-red-500/45 bg-red-500/5 text-red-50/95'
                  : 'border-emerald-500/45 bg-emerald-500/5 text-emerald-50/95',
              )}
            >
              <p className="font-medium">Creator likelihood</p>
              <p
                className={cn(
                  'mt-1 text-sm',
                  data.creatorDetector.is_creator_likely ? 'text-red-100/90' : 'text-emerald-100/90',
                )}
              >
                {data.creatorDetector.is_creator_likely
                  ? 'Heuristic suggests this fan may also create content or promote a page.'
                  : 'No strong creator-style signals in stored text (heuristic).'}
              </p>
              {data.creatorDetector.rationale_snippets.length > 0 && (
                <ul
                  className={cn(
                    'mt-2 list-inside list-disc text-xs',
                    data.creatorDetector.is_creator_likely ? 'text-red-100/75' : 'text-emerald-100/75',
                  )}
                >
                  {data.creatorDetector.rationale_snippets.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {data?.threadInsight?.profileJson != null &&
            formatProfileSection(data.threadInsight.profileJson).length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold">Thread profile</p>
              {formatProfileSection(data.threadInsight.profileJson).map((block) => (
                <div key={block.label}>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{block.label}</p>
                  <ul className="mt-1 list-inside list-disc text-sm">
                    {block.items.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {data?.aiSummary?.summaryJson != null && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">AI summary</p>
              <pre className="max-h-40 overflow-auto rounded-md bg-muted/50 p-3 text-xs whitespace-pre-wrap break-words">
                {JSON.stringify(data.aiSummary.summaryJson, null, 2)}
              </pre>
              {data.aiSummary.lastAnalyzedAt && (
                <p className="text-xs text-muted-foreground">
                  Last analyzed: {new Date(data.aiSummary.lastAnalyzedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {data?.threadInsight?.threadSnapshotExcerpt && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Thread snapshot (excerpt)</p>
              <p className="max-h-40 overflow-auto rounded-md bg-muted/30 p-3 text-xs whitespace-pre-wrap text-muted-foreground">
                {data.threadInsight.threadSnapshotExcerpt}
              </p>
              {data.threadInsight.lastThreadRefreshAt && (
                <p className="text-xs text-muted-foreground">
                  Refreshed: {new Date(data.threadInsight.lastThreadRefreshAt).toLocaleString()}
                </p>
              )}
              {data.threadInsight.lastScanKind && (
                <p className="text-xs text-muted-foreground">
                  Last mode: {data.threadInsight.lastScanKind === 'thread_update' ? 'Thread update' : 'Manual scan'}
                </p>
              )}
              {data.threadInsight.lastScanAt && (
                <p className="text-xs text-muted-foreground">
                  Last manual scan: {new Date(data.threadInsight.lastScanAt).toLocaleString()}
                </p>
              )}
              {data.threadInsight.lastUpdateAt && (
                <p className="text-xs text-muted-foreground">
                  Last auto update: {new Date(data.threadInsight.lastUpdateAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {data?.threadInsight?.insufficientData && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              <p className="font-medium">Profile still forming for this fan</p>
              <p className="mt-1 text-xs text-amber-100/90">
                {data.threadInsight.insufficientDataReason ??
                  'Not enough conversation yet. Ask the fan to chat more, then run Scan again.'}
              </p>
            </div>
          )}

          {!loading && data && !data.threadInsight && !data.aiSummary?.summaryJson && (
            <p className="text-sm text-muted-foreground">
              No stored thread insight or AI summary yet. Use the refresh button above to sync from the platform, run
              Scan in Divine AI (that also saves the thread), or send a message in chat.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
