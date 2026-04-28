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
  FAN_CLASSIFY_ACTIVE_CHAT_SHORT_LABEL,
  fanClassifyListShortName,
} from '@/lib/divine-manager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Loader2, ListTree, ChevronDown, Sparkles, Check, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    description: 'Same spend profile, on file 45+ days.',
  },
  spenders: {
    title: 'Spenders',
    description: 'Tips, DM/PPV, or feed spend tracked in CRM.',
  },
  subscriber_no_extra: {
    title: 'Subscribers, no extra spend',
    description: 'Active paid subscription, no extra-channel spend tracked.',
  },
  recent_sub_3d: {
    title: 'Recent subs (3 days)',
    description: 'New subscribers in roughly the last 3 days.',
  },
  whale_spend: {
    title: 'Top spenders',
    description:
      'Fans who rank highest on spend for your OnlyFans. On Fansly, the same idea uses totals from your CRM.',
    legacy: true,
  },
  active_chatter: {
    title: 'Recently chatting',
    description: 'Fans you have been in recent conversation with on OnlyFans.',
    legacy: true,
  },
  cold: {
    title: 'Quiet, light spend',
    description: 'Fans who have gone quiet with relatively little spend — useful for gentle re‑engagement.',
    legacy: true,
  },
}

function mergeSegments(saved: FanClassifySegmentRule[] | undefined): FanClassifySegmentRule[] {
  const defaults = defaultSmartClassifySegments()
  if (!saved?.length) return defaults
  const byKey = new Map(saved.map((s) => [s.segment, s] as const))
  return defaults.map((d) => ({ ...d, ...byKey.get(d.segment) }))
}

/** Core segments always run when sync is on — keep enabled and drop manual list overrides on save. */
function segmentsForAutosyncSave(segments: FanClassifySegmentRule[]): FanClassifySegmentRule[] {
  return segments.map((s) =>
    SEGMENT_HELP[s.segment].legacy
      ? s
      : { ...s, enabled: true, listId: undefined, listName: undefined, tagName: undefined },
  )
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
  compact?: boolean
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [segments, setSegments] = useState<FanClassifySegmentRule[]>(defaultSmartClassifySegments())
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [activeChatEnabled, setActiveChatEnabled] = useState(false)
  const [activeChatWindowMins, setActiveChatWindowMins] = useState(30)
  const [activity, setActivity] = useState<ActivityJson | null>(null)
  const [legacyOpen, setLegacyOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)

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
      setLastSync(h.last_sync_at ?? null)
      setSegments(mergeSegments(h.segments))
      const ac = h.active_chat ?? {}
      setActiveChatEnabled(Boolean(ac.enabled))
      setActiveChatWindowMins(typeof ac.window_minutes === 'number' ? ac.window_minutes : 30)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash !== '#arrangements') return
    requestAnimationFrame(() => {
      document.getElementById('arrangements')?.scrollIntoView({ behavior: 'smooth' })
    })
  }, [])

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
      const ac: FanClassifyActiveChatConfig = {
        enabled: activeChatEnabled,
        window_minutes: activeChatWindowMins,
        tag_name: FAN_CLASSIFY_ACTIVE_CHAT_DEFAULT_NAME,
        list_name: FAN_CLASSIFY_ACTIVE_CHAT_DEFAULT_NAME,
      }
      const payload: FanClassifyConfig = {
        enabled,
        auto_create_lists: enabled,
        segments: enabled ? segmentsForAutosyncSave(segments) : segments,
        active_chat: ac,
        last_sync_at: lastSync ?? undefined,
      }
      await upsertSettings(supabase, user.id, { housekeeping_lists: payload })
      setSegments(mergeSegments(payload.segments))
    } finally {
      setSaving(false)
    }
  }

  const updateLegacySegment = (index: number, patch: Partial<FanClassifySegmentRule>) => {
    setSegments((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  const smartRows = segments.filter((s) => !SEGMENT_HELP[s.segment].legacy)
  const legacyRows = segments.filter((s) => SEGMENT_HELP[s.segment].legacy)

  const windowSliderMax = 120
  const windowMinutes = Math.min(windowSliderMax, Math.max(5, activeChatWindowMins))

  const connected = hasOnlyFans || hasFansly

  return (
    <div
      id="arrangements"
      data-tour="fans-classify"
      className={compact ? 'space-y-6' : 'mx-auto max-w-4xl space-y-8'}
    >
      {!compact ? (
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Sparkles className="h-6 w-6 text-violet-500" />
            Arrangements
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Creatix <strong className="text-foreground">detects segments automatically</strong> from your CRM —
            spend, subscription tenure, and activity. When sync is on, matching{' '}
            <strong className="text-foreground">OnlyFans lists</strong> and{' '}
            <strong className="text-foreground">Fansly tags</strong> are kept up to date on schedule. No list IDs or
            manual mapping required.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Automatic smart lists from CRM signals — toggle sync below; lists and tags use predictable names.
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
                Smart lists
              </CardTitle>
              <CardDescription>
                One switch turns on scheduled sync. Segments below always apply when sync is enabled — detection runs in
                the background.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                className={`flex flex-col justify-between gap-4 rounded-xl border border-border/80 p-4 sm:flex-row sm:items-center ${!connected ? 'opacity-80' : ''}`}
              >
                <div className="min-w-0">
                  <Label htmlFor="sc-enabled" className="text-sm font-medium">
                    Automatic smart lists
                  </Label>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {connected
                      ? 'Keeps matching lists and tags updated on your platforms. Runs on the daily sync job.'
                      : 'Connect OnlyFans or Fansly under Settings → Integrations to sync lists and tags.'}
                  </p>
                </div>
                <Switch
                  id="sc-enabled"
                  checked={enabled}
                  disabled={!connected}
                  onCheckedChange={setEnabled}
                />
              </div>

              {lastSync ? (
                <p className="text-xs text-muted-foreground">Last sync: {new Date(lastSync).toLocaleString()}</p>
              ) : null}

              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Segments</p>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {smartRows.map((seg) => {
                    const help = SEGMENT_HELP[seg.segment]
                    return (
                      <li
                        key={seg.segment}
                        className="flex gap-3 rounded-2xl border border-border/50 bg-muted/[0.12] px-4 py-3.5 sm:px-4 sm:py-4"
                      >
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600/90 dark:text-emerald-400/90"
                          aria-hidden
                          strokeWidth={2.25}
                        />
                        <div className="min-w-0 space-y-1">
                          <p className="text-[15px] font-semibold leading-snug tracking-tight text-foreground">
                            {help.title}
                          </p>
                          <p className="text-[13px] leading-relaxed text-muted-foreground">{help.description}</p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <Collapsible open={legacyOpen} onOpenChange={setLegacyOpen}>
                <div
                  className={cn(
                    'overflow-hidden rounded-2xl border border-border/50 bg-muted/[0.06]',
                    'shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]',
                  )}
                >
                  <CollapsibleTrigger
                    className={cn(
                      'flex w-full items-start gap-4 px-5 py-5 text-left transition-colors',
                      'hover:bg-muted/[0.35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Optional
                      </p>
                      <p className="text-[17px] font-semibold tracking-tight text-foreground sm:text-lg">
                        OnlyFans audience rules
                      </p>
                      <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                        Three extra slices — top spenders, recent chats, and quiet fans. They stay off until you turn each
                        one on.
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        'mt-1 h-5 w-5 shrink-0 text-muted-foreground/80 transition-transform duration-200 ease-out',
                        legacyOpen ? 'rotate-180' : '',
                      )}
                      aria-hidden
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t border-border/35">
                      {legacyRows.map((seg, rowIdx) => {
                        const i = segments.findIndex((s) => s.segment === seg.segment)
                        const help = SEGMENT_HELP[seg.segment]
                        return (
                          <div
                            key={seg.segment}
                            className={cn(
                              'px-5 py-6 sm:px-6',
                              rowIdx > 0 && 'border-t border-border/30',
                            )}
                          >
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
                              <div className="min-w-0 flex-1 space-y-2">
                                <p className="text-[15px] font-semibold tracking-tight text-foreground">{help.title}</p>
                                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                                  {help.description}
                                </p>
                                <p className="text-[12px] leading-snug text-muted-foreground/85">
                                  <span className="text-muted-foreground/65">Appears as · </span>
                                  {fanClassifyListShortName(seg.segment)}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-3 sm:pt-0.5">
                                <span className="text-[13px] text-muted-foreground sm:hidden">Enable</span>
                                <Switch
                                  checked={seg.enabled !== false}
                                  onCheckedChange={(v) => updateLegacySegment(i, { enabled: v })}
                                  aria-label={`${help.title} — enable segment`}
                                />
                              </div>
                            </div>

                            <div
                              className={cn(
                                'mt-6 grid gap-5',
                                seg.segment === 'cold'
                                  ? 'sm:grid-cols-2 sm:gap-x-8'
                                  : 'sm:grid-cols-1 sm:max-w-xs',
                              )}
                            >
                              {seg.segment === 'whale_spend' && (
                                <div className="space-y-2">
                                  <Label htmlFor={`whale-min-${seg.segment}`} className="text-[13px] font-medium">
                                    Minimum spend
                                  </Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      id={`whale-min-${seg.segment}`}
                                      type="number"
                                      inputMode="decimal"
                                      className="h-10 max-w-[7.5rem] rounded-xl tabular-nums"
                                      value={seg.spendMin ?? ''}
                                      onChange={(e) =>
                                        updateLegacySegment(i, { spendMin: parseFloat(e.target.value) || undefined })
                                      }
                                    />
                                    <span className="text-[13px] text-muted-foreground">USD</span>
                                  </div>
                                </div>
                              )}
                              {(seg.segment === 'active_chatter' || seg.segment === 'cold') && (
                                <div className="space-y-2">
                                  <Label htmlFor={`chat-days-${seg.segment}`} className="text-[13px] font-medium">
                                    {seg.segment === 'cold' ? 'Look back' : 'Recent within'}
                                  </Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      id={`chat-days-${seg.segment}`}
                                      type="number"
                                      inputMode="numeric"
                                      className="h-10 max-w-[7.5rem] rounded-xl tabular-nums"
                                      value={seg.chatDays ?? ''}
                                      onChange={(e) =>
                                        updateLegacySegment(i, { chatDays: parseInt(e.target.value, 10) || undefined })
                                      }
                                    />
                                    <span className="text-[13px] text-muted-foreground">days</span>
                                  </div>
                                </div>
                              )}
                              {seg.segment === 'cold' && (
                                <div className="space-y-2">
                                  <Label htmlFor={`cold-max-${seg.segment}`} className="text-[13px] font-medium">
                                    Spend below
                                  </Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      id={`cold-max-${seg.segment}`}
                                      type="number"
                                      inputMode="decimal"
                                      className="h-10 max-w-[7.5rem] rounded-xl tabular-nums"
                                      value={seg.coldSpendMax ?? ''}
                                      onChange={(e) =>
                                        updateLegacySegment(i, {
                                          coldSpendMax: parseFloat(e.target.value) || undefined,
                                        })
                                      }
                                    />
                                    <span className="text-[13px] text-muted-foreground">USD</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </CardContent>
          </Card>

          <div
            className={cn(
              'rounded-2xl border border-border/35 bg-gradient-to-b from-muted/[0.14] to-transparent',
              'shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]',
            )}
          >
            <div className="p-6 sm:p-7">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/40 bg-background/55"
                  aria-hidden
                >
                  <MessageCircle className="h-5 w-5 text-foreground/75" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Recent chats
                  </p>
                  <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                    Put active conversations in one place
                  </h3>
                  <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                    When someone DMs you, Creatix can tag them on the platform so they appear in a single “still warm”
                    group. When they stop messaging for a while, they drop off automatically — so the list stays a
                    quick reply queue, not a second CRM.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                {!connected ? (
                  <p className="text-sm text-muted-foreground">
                    Connect OnlyFans or Fansly under Settings → Integrations to use this.
                  </p>
                ) : (
                  <>
                    <div
                      className={cn(
                        'flex flex-col justify-between gap-4 rounded-xl border border-border/50 bg-background/40 p-4 sm:flex-row sm:items-center',
                        !activeChatEnabled && 'opacity-95',
                      )}
                    >
                      <div className="min-w-0">
                        <Label htmlFor="ac-enabled" className="text-sm font-medium text-foreground">
                          Show recent messengers on the platform
                        </Label>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          Off by default. Turn on only if you want that live list or tag alongside smart lists.
                        </p>
                      </div>
                      <Switch id="ac-enabled" checked={activeChatEnabled} onCheckedChange={setActiveChatEnabled} />
                    </div>

                    <div
                      className={cn(
                        'space-y-3 rounded-xl border border-border/30 bg-background/25 px-4 py-4 transition-opacity',
                        !activeChatEnabled && 'opacity-65',
                      )}
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                        <Label className="text-xs font-medium text-foreground/90">How long “recent” means</Label>
                        <span className="text-xs tabular-nums text-muted-foreground">{windowMinutes} min quiet</span>
                      </div>
                      <Slider
                        className="w-full"
                        min={5}
                        max={windowSliderMax}
                        step={5}
                        value={[windowMinutes]}
                        onValueChange={([v]) => setActiveChatWindowMins(v ?? 30)}
                      />
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        After this many minutes without a message from them, they&apos;re removed from the queue on the
                        next sync.
                      </p>
                    </div>

                    <p className="text-[12px] leading-relaxed text-muted-foreground/90">
                      <span className="text-muted-foreground/70">Appears as · </span>
                      <span className="font-medium text-foreground/90">{FAN_CLASSIFY_ACTIVE_CHAT_SHORT_LABEL}</span>
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <Collapsible open={activityOpen} onOpenChange={setActivityOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ChevronDown className={`h-4 w-4 transition-transform ${activityOpen ? 'rotate-180' : ''}`} />
              Activity snapshot (refreshes every 15s)
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <Card className="border-border bg-card">
                <CardContent className="space-y-4 pt-6">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-xs text-muted-foreground">Messages in last 1 min</p>
                      <p className="text-2xl font-semibold tabular-nums">{activity?.messages_last_1min ?? '—'}</p>
                    </div>
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-xs text-muted-foreground">
                        Fans in active window (~{activity?.window_minutes ?? '—'}m)
                      </p>
                      <p className="text-2xl font-semibold tabular-nums">{activity?.active_chats_tracked ?? '—'}</p>
                    </div>
                  </div>
                  {activity?.tracked_preview?.length ? (
                    <ul className="space-y-1 text-xs text-muted-foreground">
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
                    <p className="text-xs text-muted-foreground">No fans in the current window.</p>
                  )}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          <Button type="button" onClick={() => void save()} disabled={saving || !connected}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </>
      )}
    </div>
  )
}
