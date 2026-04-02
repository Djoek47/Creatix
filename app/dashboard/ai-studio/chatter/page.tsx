'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Bot, Crown, Loader2, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import {
  DEFAULT_AI_CHATTER_SETTINGS,
  parseAiChatterSettings,
  type AiChatterEngagementProfile,
  type AiChatterSendMode,
  type AiChatterSettings,
} from '@/lib/divine/ai-chatter-types'

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
}

type AutomationRow = {
  id: string
  fan_id: string
  platform_fan_id: string
  fan_username: string | null
  status: string
  settings: unknown
  beta_acknowledged_at: string | null
  last_processed_at: string | null
  last_processed_message_id: string | null
  updated_at: string
}

type FanRow = {
  id: string
  username: string | null
  display_name: string | null
  platform_fan_id: string | null
}

type EventRow = {
  id: string
  automation_id: string
  type: string
  payload: Record<string, unknown>
  created_at: string
}

function parseSettings(raw: unknown): AiChatterSettings {
  return parseAiChatterSettings(raw)
}

function AiChatterDashboardInner() {
  const searchParams = useSearchParams()
  const [listTab, setListTab] = useState<'chatter' | 'whisper'>('chatter')
  const [automations, setAutomations] = useState<AutomationRow[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [fans, setFans] = useState<FanRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newFanId, setNewFanId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [sendMode, setSendMode] = useState<AiChatterSendMode>('queue_review')
  const [maxReplies, setMaxReplies] = useState(String(DEFAULT_AI_CHATTER_SETTINGS.max_replies_per_day))
  const [minMinutes, setMinMinutes] = useState(String(DEFAULT_AI_CHATTER_SETTINGS.min_minutes_between_sends))
  const [keywordsText, setKeywordsText] = useState('')
  const [notifyRisk, setNotifyRisk] = useState(true)
  const [whaleTone, setWhaleTone] = useState(true)
  const [bypassMimic, setBypassMimic] = useState(false)
  const [betaAck, setBetaAck] = useState(false)
  const [statusLocal, setStatusLocal] = useState<'draft_setup' | 'active' | 'paused'>('draft_setup')
  const [engagementProfile, setEngagementProfile] = useState<AiChatterEngagementProfile>('standard')
  const [useGiftWishlist, setUseGiftWishlist] = useState(true)

  const selected = useMemo(
    () => automations.find((a) => a.id === selectedId) ?? null,
    [automations, selectedId],
  )

  const loadAll = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError('Sign in required.')
        return
      }

      const [autoRes, fanRes] = await Promise.all([
        fetch('/api/ai-chatter/automations', { credentials: 'include' }),
        supabase
          .from('fans')
          .select('id, username, display_name, platform_fan_id')
          .eq('user_id', user.id)
          .eq('platform', 'onlyfans')
          .order('updated_at', { ascending: false })
          .limit(400),
      ])

      if (!autoRes.ok) {
        const j = await autoRes.json().catch(() => ({}))
        setError((j as { error?: string }).error || 'Failed to load automations')
        return
      }
      const autoJson = (await autoRes.json()) as { automations: AutomationRow[]; events: EventRow[] }
      setAutomations(autoJson.automations ?? [])
      setEvents(autoJson.events ?? [])

      if (fanRes.error) {
        setError(fanRes.error.message)
        return
      }
      setFans((fanRes.data as FanRow[]) ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  useEffect(() => {
    const fid = searchParams.get('fanId')
    const prof = searchParams.get('profile')
    if (fid && isUuid(fid)) setNewFanId(fid)
    if (prof === 'whale_whisper') setListTab('whisper')
  }, [searchParams])

  const filteredAutomations = useMemo(() => {
    return automations.filter((a) => {
      const p = parseSettings(a.settings).engagement_profile
      return listTab === 'whisper' ? p === 'whale_whisper' : p === 'standard'
    })
  }, [automations, listTab])

  useEffect(() => {
    setSelectedId((prev) => {
      if (!prev) return prev
      const sel = automations.find((a) => a.id === prev)
      if (!sel) return null
      const p = parseSettings(sel.settings).engagement_profile
      const inTab = listTab === 'whisper' ? p === 'whale_whisper' : p === 'standard'
      return inTab ? prev : null
    })
  }, [listTab, automations])

  useEffect(() => {
    if (!selected) {
      setSendMode('queue_review')
      setMaxReplies(String(DEFAULT_AI_CHATTER_SETTINGS.max_replies_per_day))
      setMinMinutes(String(DEFAULT_AI_CHATTER_SETTINGS.min_minutes_between_sends))
      setKeywordsText('')
      setNotifyRisk(true)
      setWhaleTone(true)
      setBypassMimic(false)
      setBetaAck(false)
      setStatusLocal('draft_setup')
      setEngagementProfile('standard')
      setUseGiftWishlist(true)
      return
    }
    const s = parseSettings(selected.settings)
    setSendMode(s.send_mode)
    setMaxReplies(String(s.max_replies_per_day))
    setMinMinutes(String(s.min_minutes_between_sends))
    setKeywordsText(s.escalation_keywords.join('\n'))
    setNotifyRisk(s.notify_on_risk)
    setWhaleTone(s.whale_nurture_tone)
    setBypassMimic(s.bypass_mimic_review_gate)
    setBetaAck(!!selected.beta_acknowledged_at)
    setEngagementProfile(s.engagement_profile)
    setUseGiftWishlist(s.use_gift_wishlist)
    setStatusLocal(
      selected.status === 'active' || selected.status === 'paused' || selected.status === 'draft_setup'
        ? selected.status
        : 'draft_setup',
    )
  }, [selected])

  const eventsForSelected = useMemo(() => {
    if (!selectedId) return events.slice(0, 40)
    return events.filter((e) => e.automation_id === selectedId).slice(0, 40)
  }, [events, selectedId])

  const createAutomation = async () => {
    if (!newFanId) {
      setError('Pick a fan first.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/ai-chatter/automations', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fan_id: newFanId,
          status: 'draft_setup',
          settings: {
            engagement_profile: listTab === 'whisper' ? 'whale_whisper' : 'standard',
          },
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (res.status === 409 && (j as { automation_id?: string }).automation_id) {
        setSelectedId((j as { automation_id: string }).automation_id)
        await loadAll()
        return
      }
      if (!res.ok) {
        setError((j as { error?: string }).error || 'Create failed')
        return
      }
      const row = (j as { automation: AutomationRow }).automation
      if (row?.id) setSelectedId(row.id)
      setNewFanId('')
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  const saveSettings = async () => {
    if (!selected) return
    const keywords = keywordsText
      .split(/[\n,]+/)
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean)

    const maxN = Math.min(200, Math.max(1, parseInt(maxReplies, 10) || DEFAULT_AI_CHATTER_SETTINGS.max_replies_per_day))
    const minM = Math.min(240, Math.max(0, parseInt(minMinutes, 10) || 0))

    const settings: Partial<AiChatterSettings> = {
      send_mode: sendMode,
      engagement_profile: engagementProfile,
      use_gift_wishlist: useGiftWishlist,
      max_replies_per_day: maxN,
      min_minutes_between_sends: minM,
      escalation_keywords: keywords,
      notify_on_risk: notifyRisk,
      whale_nurture_tone: whaleTone,
      bypass_mimic_review_gate: bypassMimic,
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/ai-chatter/automations/${selected.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings,
          status: statusLocal,
          beta_acknowledged: betaAck,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((j as { error?: string }).error || 'Save failed')
        return
      }
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const activateThread = async (setActive: boolean) => {
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/ai-chatter/automations/${selected.id}/activate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setActive }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((j as { error?: string }).error || 'Activate failed')
        return
      }
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Activate failed')
    } finally {
      setSaving(false)
    }
  }

  const deleteAutomation = async () => {
    if (!selected || !confirm('Remove this automation?')) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/ai-chatter/automations/${selected.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError((j as { error?: string }).error || 'Delete failed')
        return
      }
      setSelectedId(null)
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  const fanLabel = (f: FanRow) => {
    const u = f.username || f.display_name || f.platform_fan_id || f.id
    return String(u)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/ai-studio/tools" aria-label="Back to tools">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bot className="h-6 w-6 shrink-0 text-primary" aria-hidden />
          <span>OnlyFans · Mimic, thread context, queue by default</span>
        </div>
      </div>

      <Alert className="border-amber-500/40 bg-amber-500/5">
        <AlertTitle>Beta</AlertTitle>
        <AlertDescription className="text-sm">
          Wrong tone, platform rules, over-messaging, and PPV mistakes are possible. You stay responsible for every
          message. Mimic consent and queue/review are recommended. Auto-send requires acknowledgment below.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={listTab} onValueChange={(v) => setListTab(v as 'chatter' | 'whisper')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="chatter">AI Chatter</TabsTrigger>
          <TabsTrigger value="whisper" className="gap-1">
            <Crown className="h-3.5 w-3.5" />
            Whale whisper
          </TabsTrigger>
        </TabsList>
        <TabsContent value="chatter" className="mt-3 text-sm text-muted-foreground">
          Standard automations. Optional auto-send with beta acknowledgment.
        </TabsContent>
        <TabsContent value="whisper" className="mt-3 text-sm text-muted-foreground">
          VIP list: drafts only—nothing is ever sent automatically. You review every message in Messages.
        </TabsContent>
      </Tabs>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Automations</CardTitle>
            <CardDescription>
              {listTab === 'whisper'
                ? 'Whale whisper automations (outbox-only).'
                : 'Standard chatter automations.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>New automation (OnlyFans fan)</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select value={newFanId || undefined} onValueChange={setNewFanId}>
                  <SelectTrigger className="w-full sm:flex-1">
                    <SelectValue placeholder={loading ? 'Loading fans…' : 'Choose fan'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {fans.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        @{fanLabel(f)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button disabled={saving || !newFanId} onClick={() => void createAutomation()}>
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Fans come from your CRM (synced conversations). Open{' '}
                <Link href="/dashboard/messages" className="text-primary underline">
                  Messages
                </Link>{' '}
                to refresh fan rows.
              </p>
            </div>

            <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-border p-2">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAutomations.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No automations in this tab yet.</p>
              ) : (
                filteredAutomations.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      selectedId === a.id ? 'border-primary bg-primary/10' : 'border-transparent bg-muted/40 hover:bg-muted/60'
                    }`}
                  >
                    <span className="truncate font-medium">@{a.fan_username || a.platform_fan_id}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      {parseSettings(a.settings).engagement_profile === 'whale_whisper' && (
                        <Badge variant="outline" className="text-[10px]">
                          VIP
                        </Badge>
                      )}
                      <Badge variant={a.status === 'active' ? 'default' : 'secondary'}>{a.status}</Badge>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Settings</CardTitle>
            <CardDescription>
              {selected ? `Editing @${selected.fan_username || selected.platform_fan_id}` : 'Pick an automation.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!selected ? (
              <p className="text-sm text-muted-foreground">Create or select an automation to edit.</p>
            ) : (
              <>
                {engagementProfile === 'whale_whisper' && (
                  <Alert className="border-primary/40 bg-primary/5">
                    <AlertTitle className="text-sm">Whale whisper</AlertTitle>
                    <AlertDescription className="text-xs">
                      Auto-send is disabled for this profile. Every reply stays in your outbox until you send it from
                      Messages.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>Engagement profile</Label>
                  <Select
                    value={engagementProfile}
                    onValueChange={(v) => setEngagementProfile(v as AiChatterEngagementProfile)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard chatter</SelectItem>
                      <SelectItem value="whale_whisper">Whale whisper (drafts only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={statusLocal}
                    onValueChange={(v) =>
                      setStatusLocal(v as 'draft_setup' | 'active' | 'paused')
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft_setup">Draft setup</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 rounded-lg border border-border p-3">
                  <Checkbox
                    id="giftwl"
                    checked={useGiftWishlist}
                    onCheckedChange={(c) => setUseGiftWishlist(c === true)}
                  />
                  <label htmlFor="giftwl" className="text-sm cursor-pointer">
                    Include saved gift wishlist in AI context{' '}
                    <Link href="/dashboard/ai-studio/gifts" className="text-primary underline">
                      (manage links)
                    </Link>
                  </label>
                </div>

                <div className={`space-y-3 ${engagementProfile === 'whale_whisper' ? 'opacity-60' : ''}`}>
                  <Label>Send mode {engagementProfile === 'whale_whisper' && '(not used for whale whisper)'}</Label>
                  <RadioGroup
                    value={sendMode}
                    onValueChange={(v) => setSendMode(v as AiChatterSendMode)}
                    disabled={engagementProfile === 'whale_whisper'}
                  >
                    <div className="flex items-start gap-2 rounded-lg border border-border p-3">
                      <RadioGroupItem value="queue_review" id="m1" className="mt-1" />
                      <label htmlFor="m1" className="cursor-pointer text-sm leading-snug">
                        <span className="font-medium">Queue for review (default)</span>
                        <span className="block text-muted-foreground">
                          Draft lands in your outbox; we notify you and open Messages with the text ready to send.
                        </span>
                      </label>
                    </div>
                    <div className="flex items-start gap-2 rounded-lg border border-border p-3">
                      <RadioGroupItem value="auto_send_opt_in" id="m2" className="mt-1" />
                      <label htmlFor="m2" className="cursor-pointer text-sm leading-snug">
                        <span className="font-medium">Opt-in auto-send</span>
                        <span className="block text-muted-foreground">
                          Sends text-only replies when Mimic allows (or when bypass is enabled). Requires beta
                          acknowledgment.
                        </span>
                      </label>
                    </div>
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                      <RadioGroupItem value="experimental_auto" id="m3" className="mt-1" />
                      <label htmlFor="m3" className="cursor-pointer text-sm leading-snug">
                        <span className="font-medium">Experimental auto (not recommended)</span>
                        <span className="block text-muted-foreground">
                          Requires beta acknowledgment and “bypass Mimic review gate”. Higher misfire risk.
                        </span>
                      </label>
                    </div>
                  </RadioGroup>
                </div>

                <div className={`flex flex-col gap-3 rounded-lg border border-border p-3 ${engagementProfile === 'whale_whisper' ? 'opacity-60' : ''}`}>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="beta"
                      checked={betaAck}
                      onCheckedChange={(c) => setBetaAck(c === true)}
                    />
                    <label htmlFor="beta" className="text-sm leading-snug cursor-pointer">
                      I understand auto-send risks and platform rules; I remain responsible for outbound content.
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="bypass"
                      checked={bypassMimic}
                      onCheckedChange={(c) => setBypassMimic(c === true)}
                    />
                    <label htmlFor="bypass" className="text-sm leading-snug cursor-pointer">
                      Bypass Mimic “never send without review” (required for experimental auto; optional for opt-in
                      auto when Mimic blocks).
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notify"
                      checked={notifyRisk}
                      onCheckedChange={(c) => setNotifyRisk(c === true)}
                    />
                    <label htmlFor="notify" className="text-sm cursor-pointer">
                      Notify on risk / escalation signals
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="whale"
                      checked={whaleTone}
                      onCheckedChange={(c) => setWhaleTone(c === true)}
                    />
                    <label htmlFor="whale" className="text-sm cursor-pointer">
                      Whale-nurture tone in prompts
                    </label>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Max replies / UTC day</Label>
                    <Input value={maxReplies} onChange={(e) => setMaxReplies(e.target.value)} inputMode="numeric" />
                  </div>
                  <div className="space-y-2">
                    <Label>Min minutes between sends</Label>
                    <Input value={minMinutes} onChange={(e) => setMinMinutes(e.target.value)} inputMode="numeric" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Escalation keywords (one per line or comma-separated)</Label>
                  <Textarea
                    value={keywordsText}
                    onChange={(e) => setKeywordsText(e.target.value)}
                    className="min-h-[80px] font-mono text-xs"
                    placeholder="refund&#10;chargeback&#10;lawyer"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button disabled={saving} onClick={() => void saveSettings()}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => void activateThread(false)}
                  >
                    Refresh thread snapshot
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className="gap-1"
                    disabled={saving}
                    onClick={() => void activateThread(true)}
                  >
                    <Play className="h-4 w-4" />
                    Prime &amp; set active
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    disabled={saving}
                    onClick={() => void deleteAutomation()}
                    aria-label="Delete automation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Open thread:{' '}
                  <Link
                    className="text-primary underline"
                    href={`/dashboard/messages?fanId=${encodeURIComponent(selected.platform_fan_id)}`}
                  >
                    Messages
                  </Link>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription>
            {selected ? 'Events for this automation (latest first).' : 'All recent events.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-72 space-y-2 overflow-y-auto text-sm">
            {eventsForSelected.length === 0 ? (
              <p className="text-muted-foreground">No events yet.</p>
            ) : (
              eventsForSelected.map((ev) => (
                <div
                  key={ev.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-border/80 bg-muted/20 px-3 py-2"
                >
                  <span className="font-medium capitalize">{ev.type.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(ev.created_at).toLocaleString()}
                  </span>
                  {Object.keys(ev.payload).length > 0 && (
                    <pre className="w-full overflow-x-auto text-[11px] text-muted-foreground">
                      {JSON.stringify(ev.payload)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AiChatterDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AiChatterDashboardInner />
    </Suspense>
  )
}
