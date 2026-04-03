'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSettings, upsertSettings } from '@/lib/divine-manager'
import type {
  FanClassifyActiveChatConfig,
  FanClassifyConfig,
  FanClassifySegmentKey,
  FanClassifySegmentRule,
} from '@/lib/divine-manager'
import {
  defaultSmartClassifySegments,
  FAN_CLASSIFY_ACTIVE_CHAT_DEFAULT_NAME,
  defaultFanClassifyListName,
} from '@/lib/divine-manager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Loader2, ListTree, ChevronDown, Sparkles } from 'lucide-react'

const SEGMENT_HELP: Record<
  FanClassifySegmentKey,
  { title: string; description: string; legacy?: boolean }
> = {
  freeloader_new: {
    title: 'Freeloaders (under 45 days)',
    description: 'Fans with no meaningful spend who joined your CRM in the last 45 days.',
  },
  freeloader_mature: {
    title: 'Freeloaders (45+ days)',
    description: 'Same spend profile as above, but subscribed or on file for 45 days or more.',
  },
  spenders: {
    title: 'Spenders',
    description: 'Fans with tips, DM/PPV, or feed spend tracked in CRM (webhook breakdown).',
  },
  subscriber_no_extra: {
    title: 'Subscribers, no extra spend',
    description: 'Active paid subscription, no extra-channel spend tracked.',
  },
  recent_sub_3d: {
    title: 'Recent subs (3 days)',
    description: 'New subscribers in roughly the last 3 days (CRM subscription start).',
  },
  whale_spend: {
    title: 'Whales (legacy API)',
    description: 'High spenders from live OnlyFans top list (API). Fansly uses CRM totals only.',
    legacy: true,
  },
  active_chatter: {
    title: 'Active chatters (legacy API)',
    description: 'Recent conversations from OnlyFans API. Fansly uses CRM last interaction.',
    legacy: true,
  },
  cold: {
    title: 'Cold / low engagement (legacy API)',
    description: 'Low spend and quiet on OnlyFans API paths. Fansly uses CRM rules.',
    legacy: true,
  },
}

function mergeSegments(saved: FanClassifySegmentRule[] | undefined): FanClassifySegmentRule[] {
  const defaults = defaultSmartClassifySegments()
  if (!saved?.length) return defaults
  const byKey = new Map(saved.map((s) => [s.segment, s] as const))
  return defaults.map((d) => ({ ...d, ...byKey.get(d.segment) }))
}

type ActivityJson = {
  window_minutes: number
  messages_last_1min: number
  active_chats_tracked: number
  tracked_preview: { platform: string; platform_fan_id: string; username: string | null; last_at: string }[]
}

export function FansArrangementsSection({
  hasOnlyFans,
  hasFansly,
  compact = false,
}: {
  hasOnlyFans: boolean
  hasFansly: boolean
  /** When true, omit the large page title (embedded on Fans). */
  compact?: boolean
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [autoCreate, setAutoCreate] = useState(false)
  const [segments, setSegments] = useState<FanClassifySegmentRule[]>(defaultSmartClassifySegments())
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [activeChat, setActiveChat] = useState<FanClassifyActiveChatConfig>({
    enabled: false,
    window_minutes: 30,
    list_id: '',
    list_name: '',
    tag_name: FAN_CLASSIFY_ACTIVE_CHAT_DEFAULT_NAME,
  })
  const [ofLists, setOfLists] = useState<{ id: string; name: string }[]>([])
  const [ofListsLoading, setOfListsLoading] = useState(false)
  const [activity, setActivity] = useState<ActivityJson | null>(null)
  const [legacyOpen, setLegacyOpen] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    setLoading(true)
    try {
      const s = await getSettings(supabase, user.id)
      const h = (s?.housekeeping_lists ?? {}) as FanClassifyConfig
      setEnabled(Boolean(h.enabled))
      setAutoCreate(Boolean(h.auto_create_lists))
      setLastSync(h.last_sync_at ?? null)
      setSegments(mergeSegments(h.segments))
      const ac = h.active_chat ?? {}
      setActiveChat({
        enabled: Boolean(ac.enabled),
        window_minutes: typeof ac.window_minutes === 'number' ? ac.window_minutes : 30,
        list_id: ac.list_id?.trim() ?? '',
        list_name: ac.list_name?.trim() ?? '',
        tag_name: ac.tag_name?.trim() || FAN_CLASSIFY_ACTIVE_CHAT_DEFAULT_NAME,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const fetchOfLists = useCallback(async () => {
    if (!hasOnlyFans) return
    setOfListsLoading(true)
    try {
      const res = await fetch('/api/fans/classify/onlyfans-lists', { credentials: 'include' })
      const json = (await res.json().catch(() => ({}))) as { lists?: { id: string; name: string }[] }
      if (res.ok && Array.isArray(json.lists)) setOfLists(json.lists)
    } finally {
      setOfListsLoading(false)
    }
  }, [hasOnlyFans])

  useEffect(() => {
    if (hasOnlyFans) void fetchOfLists()
  }, [hasOnlyFans, fetchOfLists])

  const pollActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/fans/classify/activity', { credentials: 'include' })
      const json = (await res.json().catch(() => ({}))) as ActivityJson & { error?: string }
      if (res.ok) setActivity(json)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    void pollActivity()
    const t = setInterval(() => void pollActivity(), 15000)
    return () => clearInterval(t)
  }, [pollActivity])

  const save = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    try {
      const payload: FanClassifyConfig = {
        enabled,
        auto_create_lists: autoCreate,
        segments,
        active_chat: {
          enabled: activeChat.enabled,
          window_minutes: activeChat.window_minutes,
          list_id: activeChat.list_id?.trim() || undefined,
          list_name: activeChat.list_name?.trim() || undefined,
          tag_name: activeChat.tag_name?.trim() || FAN_CLASSIFY_ACTIVE_CHAT_DEFAULT_NAME,
        },
        last_sync_at: lastSync ?? undefined,
      }
      await upsertSettings(supabase, user.id, { housekeeping_lists: payload })
    } finally {
      setSaving(false)
    }
  }

  const updateSegment = (index: number, patch: Partial<FanClassifySegmentRule>) => {
    setSegments((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  const smartRows = segments.filter((s) => !SEGMENT_HELP[s.segment].legacy)
  const legacyRows = segments.filter((s) => SEGMENT_HELP[s.segment].legacy)

  const windowSliderMax = 120
  const windowMinutes = Math.min(
    windowSliderMax,
    Math.max(5, activeChat.window_minutes ?? 30),
  )

  return (
    <div className={compact ? 'space-y-6' : 'mx-auto max-w-4xl space-y-8'}>
      {!compact ? (
        <div>
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-violet-500" />
            Arrangements
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Smart lists use your <strong className="text-foreground">CRM fans</strong> (spend, tenure, last activity)
            — freeloaders, spenders, recent subs, and more are detected automatically on sync. Optional OnlyFans list
            IDs map segments to the platform; Fansly uses matching CRM tags. Per-fan profile type (whale, creator,
            fan) is editable in the table above.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          CRM-based segments sync to platform lists/tags on schedule. Toggle segments and save — no manual OnlyFans
          IDs required for detection.
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <ListTree className="h-5 w-5" />
                Sync
              </CardTitle>
              <CardDescription>
                Enable scheduled sync (daily cron). Detection uses CRM rows; OnlyFans list mapping is optional.
                Fansly uses tags prefixed with “Creatix classify —”.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-border p-3">
                <div>
                  <Label htmlFor="sc-enabled">Enable segment sync</Label>
                  <p className="text-xs text-muted-foreground">Applies CRM segments and active-chat cleanup on cron.</p>
                </div>
                <Switch id="sc-enabled" checked={enabled} onCheckedChange={setEnabled} />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-border p-3">
                <div>
                  <Label htmlFor="sc-auto">Auto-create OnlyFans lists</Label>
                  <p className="text-xs text-muted-foreground">Creates missing lists when no list ID is set.</p>
                </div>
                <Switch id="sc-auto" checked={autoCreate} onCheckedChange={setAutoCreate} />
              </div>
              {lastSync && (
                <p className="text-xs text-muted-foreground">Last sync: {new Date(lastSync).toLocaleString()}</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Smart lists</CardTitle>
              <CardDescription>
                Toggle segments, then save. OnlyFans: user lists. Fansly: matching CRM tags (same names).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {smartRows.map((seg) => {
                const i = segments.findIndex((s) => s.segment === seg.segment)
                const help = SEGMENT_HELP[seg.segment]
                return (
                  <div key={seg.segment} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{help.title}</p>
                        <p className="text-xs text-muted-foreground">{help.description}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Default tag/list name: {defaultFanClassifyListName(seg.segment)}
                        </p>
                      </div>
                      <Switch
                        checked={seg.enabled !== false}
                        onCheckedChange={(v) => updateSegment(i, { enabled: v })}
                      />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">OnlyFans list ID (optional)</Label>
                        <Input
                          placeholder="Override list id"
                          value={seg.listId ?? ''}
                          disabled={!hasOnlyFans}
                          onChange={(e) => updateSegment(i, { listId: e.target.value.trim() || undefined })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">List / tag name override</Label>
                        <Input
                          placeholder="Match or auto-create"
                          value={seg.listName ?? seg.tagName ?? ''}
                          onChange={(e) => {
                            const v = e.target.value.trim() || undefined
                            updateSegment(i, { listName: v, tagName: v })
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}

              <Collapsible open={legacyOpen} onOpenChange={setLegacyOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground py-2">
                  <ChevronDown className={`h-4 w-4 transition-transform ${legacyOpen ? 'rotate-180' : ''}`} />
                  Advanced / legacy segments
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  {legacyRows.map((seg) => {
                    const i = segments.findIndex((s) => s.segment === seg.segment)
                    const help = SEGMENT_HELP[seg.segment]
                    return (
                      <div key={seg.segment} className="rounded-lg border border-border p-3 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{help.title}</p>
                            <p className="text-xs text-muted-foreground">{help.description}</p>
                          </div>
                          <Switch
                            checked={seg.enabled !== false}
                            onCheckedChange={(v) => updateSegment(i, { enabled: v })}
                          />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">OnlyFans list ID</Label>
                            <Input
                              placeholder="Optional"
                              value={seg.listId ?? ''}
                              disabled={!hasOnlyFans}
                              onChange={(e) => updateSegment(i, { listId: e.target.value.trim() || undefined })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">List / tag name</Label>
                            <Input
                              placeholder="Optional"
                              value={seg.listName ?? seg.tagName ?? ''}
                              onChange={(e) => {
                                const v = e.target.value.trim() || undefined
                                updateSegment(i, { listName: v, tagName: v })
                              }}
                            />
                          </div>
                        </div>
                        {seg.segment === 'whale_spend' && (
                          <div className="space-y-1">
                            <Label className="text-xs">Min spend (USD)</Label>
                            <Input
                              type="number"
                              value={seg.spendMin ?? ''}
                              onChange={(e) =>
                                updateSegment(i, { spendMin: parseFloat(e.target.value) || undefined })
                              }
                            />
                          </div>
                        )}
                        {(seg.segment === 'active_chatter' || seg.segment === 'cold') && (
                          <div className="space-y-1">
                            <Label className="text-xs">
                              {seg.segment === 'cold' ? 'Activity window (days)' : 'Active within (days)'}
                            </Label>
                            <Input
                              type="number"
                              value={seg.chatDays ?? ''}
                              onChange={(e) =>
                                updateSegment(i, { chatDays: parseInt(e.target.value, 10) || undefined })
                              }
                            />
                          </div>
                        )}
                        {seg.segment === 'cold' && (
                          <div className="space-y-1">
                            <Label className="text-xs">Max spend for cold (USD)</Label>
                            <Input
                              type="number"
                              value={seg.coldSpendMax ?? ''}
                              onChange={(e) =>
                                updateSegment(i, { coldSpendMax: parseFloat(e.target.value) || undefined })
                              }
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Active chat list / tag</CardTitle>
              <CardDescription>
                When a fan messages you, add them to a list (OnlyFans) or tag (Fansly). Cron removes them after the
                quiet window unless they message again.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-border p-3">
                <div>
                  <Label htmlFor="ac-enabled">Enable active chat sync</Label>
                  <p className="text-xs text-muted-foreground">Webhook adds; cron reconciles membership.</p>
                </div>
                <Switch
                  id="ac-enabled"
                  checked={activeChat.enabled === true}
                  onCheckedChange={(v) => setActiveChat((p) => ({ ...p, enabled: v }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fans quiet for longer than (minutes)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    className="flex-1"
                    min={5}
                    max={windowSliderMax}
                    step={5}
                    value={[windowMinutes]}
                    onValueChange={([v]) =>
                      setActiveChat((p) => ({ ...p, window_minutes: v ?? p.window_minutes }))
                    }
                  />
                  <span className="text-sm tabular-nums w-16 text-right">{windowMinutes}m</span>
                </div>
              </div>
              {hasOnlyFans && (
                <div className="space-y-2">
                  <Label>OnlyFans list ID</Label>
                  <Input
                    placeholder="Paste list id, or pick below"
                    value={activeChat.list_id ?? ''}
                    onChange={(e) => setActiveChat((p) => ({ ...p, list_id: e.target.value }))}
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select
                      value={
                        activeChat.list_id && ofLists.some((l) => l.id === activeChat.list_id)
                          ? activeChat.list_id
                          : '__pick__'
                      }
                      onValueChange={(v) => {
                        if (v === '__pick__') return
                        setActiveChat((p) => ({ ...p, list_id: v }))
                      }}
                    >
                      <SelectTrigger className="sm:flex-1">
                        <SelectValue placeholder={ofListsLoading ? 'Loading lists…' : 'Pick from your account'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__pick__">Choose…</SelectItem>
                        {ofLists.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="sm" onClick={() => void fetchOfLists()}>
                      Refresh
                    </Button>
                  </div>
                  <Label className="text-xs text-muted-foreground">List name (match / auto-create)</Label>
                  <Input
                    placeholder={`Default: ${FAN_CLASSIFY_ACTIVE_CHAT_DEFAULT_NAME}`}
                    value={activeChat.list_name ?? ''}
                    onChange={(e) => setActiveChat((p) => ({ ...p, list_name: e.target.value }))}
                  />
                </div>
              )}
              {hasFansly && (
                <div className="space-y-1">
                  <Label className="text-xs">Fansly tag name</Label>
                  <Input
                    value={activeChat.tag_name ?? ''}
                    onChange={(e) => setActiveChat((p) => ({ ...p, tag_name: e.target.value }))}
                  />
                  <p className="text-[11px] text-muted-foreground">Managed by Smart classify; shown in CRM.</p>
                </div>
              )}
              {!hasOnlyFans && !hasFansly && (
                <p className="text-sm text-muted-foreground">Connect OnlyFans or Fansly in Settings to use this.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Activity</CardTitle>
              <CardDescription>Approximate counts from cached and in-app messages (refreshes every 15s).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">Messages in last 1 min</p>
                  <p className="text-2xl font-semibold tabular-nums">{activity?.messages_last_1min ?? '—'}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">Fans in active window (~{activity?.window_minutes ?? '—'}m)</p>
                  <p className="text-2xl font-semibold tabular-nums">{activity?.active_chats_tracked ?? '—'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Tracked preview</p>
                {activity?.tracked_preview?.length ? (
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    {activity.tracked_preview.map((t) => (
                      <li key={`${t.platform}-${t.platform_fan_id}`}>
                        <span className="text-foreground">{t.username || t.platform_fan_id}</span>
                        <span className="mx-1">·</span>
                        {t.platform}
                        <span className="mx-1">·</span>
                        {new Date(t.last_at).toLocaleString()}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No fans in the current window, or no recent inbound messages recorded yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save arrangements
          </Button>
        </>
      )}
    </div>
  )
}
