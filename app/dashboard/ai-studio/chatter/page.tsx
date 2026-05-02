'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Bot, Crown, Loader2, Play, Trash2 } from 'lucide-react'
import { StudioBackLink } from '@/components/ai/studio-back-link'
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

function automationStatusLabel(t: (key: string) => string, status: string): string {
  if (status === 'draft_setup') return t('chatterPage.settings.statusApi.draft_setup')
  if (status === 'active') return t('chatterPage.settings.statusApi.active')
  if (status === 'paused') return t('chatterPage.settings.statusApi.paused')
  return status
}

function AiChatterDashboardInner() {
  const t = useTranslations('ai-tools')
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
        setError(t('chatterPage.errors.signInRequired'))
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
        setError((j as { error?: string }).error || t('chatterPage.errors.loadAutomationsFailed'))
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
      setError(e instanceof Error ? e.message : t('chatterPage.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

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
      setError(t('chatterPage.errors.pickFanFirst'))
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
        setError((j as { error?: string }).error || t('chatterPage.errors.createFailed'))
        return
      }
      const row = (j as { automation: AutomationRow }).automation
      if (row?.id) setSelectedId(row.id)
      setNewFanId('')
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('chatterPage.errors.createFailed'))
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
        setError((j as { error?: string }).error || t('chatterPage.errors.saveFailed'))
        return
      }
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('chatterPage.errors.saveFailed'))
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
        setError((j as { error?: string }).error || t('chatterPage.errors.activateFailed'))
        return
      }
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('chatterPage.errors.activateFailed'))
    } finally {
      setSaving(false)
    }
  }

  const deleteAutomation = async () => {
    if (!selected || !confirm(t('chatterPage.confirmRemoveAutomation'))) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/ai-chatter/automations/${selected.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError((j as { error?: string }).error || t('chatterPage.errors.deleteFailed'))
        return
      }
      setSelectedId(null)
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('chatterPage.errors.deleteFailed'))
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
        <StudioBackLink href="/dashboard/ai-studio/tools" aria-label={t('chrome.backToTools')} />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bot className="h-6 w-6 shrink-0 text-primary" aria-hidden />
          <span>{t('chatterPage.platformTagline')}</span>
        </div>
      </div>

      <Alert className="border-amber-500/40 bg-amber-500/5">
        <AlertTitle>{t('chatterPage.betaDisclaimer.title')}</AlertTitle>
        <AlertDescription className="text-sm">{t('chatterPage.betaDisclaimer.body')}</AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>{t('labels.error')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={listTab} onValueChange={(v) => setListTab(v as 'chatter' | 'whisper')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="chatter">{t('chatterPage.tabs.chatter')}</TabsTrigger>
          <TabsTrigger value="whisper" className="gap-1">
            <Crown className="h-3.5 w-3.5" />
            {t('chatterPage.tabs.whisper')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="chatter" className="mt-3 text-sm text-muted-foreground">
          {t('chatterPage.tabHelp.chatter')}
        </TabsContent>
        <TabsContent value="whisper" className="mt-3 text-sm text-muted-foreground">
          {t('chatterPage.tabHelp.whisper')}
        </TabsContent>
      </Tabs>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">{t('chatterPage.automations.title')}</CardTitle>
            <CardDescription>
              {listTab === 'whisper'
                ? t('chatterPage.automations.descWhisper')
                : t('chatterPage.automations.descStandard')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('chatterPage.automations.newLabel')}</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select value={newFanId || undefined} onValueChange={setNewFanId}>
                  <SelectTrigger className="w-full sm:flex-1">
                    <SelectValue
                      placeholder={loading ? t('chatterPage.automations.loadingFans') : t('chatterPage.automations.chooseFan')}
                    />
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
                  {t('chatterPage.automations.add')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('chatterPage.automations.fansHintBefore')}{' '}
                <Link href="/dashboard/messages" className="text-primary underline">
                  {t('chatterPage.automations.fansHintLink')}
                </Link>{' '}
                {t('chatterPage.automations.fansHintAfter')}
              </p>
            </div>

            <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-border p-2">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAutomations.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t('chatterPage.automations.emptyList')}</p>
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
                          {t('chatterPage.automations.badgeVip')}
                        </Badge>
                      )}
                      <Badge variant={a.status === 'active' ? 'default' : 'secondary'}>
                        {automationStatusLabel(t, a.status)}
                      </Badge>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">{t('chatterPage.settings.title')}</CardTitle>
            <CardDescription>
              {selected
                ? t('chatterPage.settings.editingFan', {
                    username: String(selected.fan_username || selected.platform_fan_id),
                  })
                : t('chatterPage.settings.pickAutomation')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!selected ? (
              <p className="text-sm text-muted-foreground">{t('chatterPage.settings.emptySelect')}</p>
            ) : (
              <>
                {engagementProfile === 'whale_whisper' && (
                  <Alert className="border-primary/40 bg-primary/5">
                    <AlertTitle className="text-sm">{t('chatterPage.settings.whaleAlertTitle')}</AlertTitle>
                    <AlertDescription className="text-xs">{t('chatterPage.settings.whaleAlertBody')}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>{t('chatterPage.settings.engagementProfile')}</Label>
                  <Select
                    value={engagementProfile}
                    onValueChange={(v) => setEngagementProfile(v as AiChatterEngagementProfile)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">{t('chatterPage.settings.profileStandard')}</SelectItem>
                      <SelectItem value="whale_whisper">{t('chatterPage.settings.profileWhisper')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('chatterPage.settings.status')}</Label>
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
                      <SelectItem value="draft_setup">{t('chatterPage.settings.statusDraft')}</SelectItem>
                      <SelectItem value="active">{t('chatterPage.settings.statusActive')}</SelectItem>
                      <SelectItem value="paused">{t('chatterPage.settings.statusPaused')}</SelectItem>
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
                    {t('chatterPage.settings.giftWishlist')}{' '}
                    <Link href="/dashboard/ai-studio/gifts" className="text-primary underline">
                      {t('chatterPage.settings.giftWishlistManage')}
                    </Link>
                  </label>
                </div>

                <div className={`space-y-3 ${engagementProfile === 'whale_whisper' ? 'opacity-60' : ''}`}>
                  <Label>
                    {t('chatterPage.settings.sendModeLabel')}{' '}
                    {engagementProfile === 'whale_whisper' ? t('chatterPage.settings.sendModeWhisperSuffix') : null}
                  </Label>
                  <RadioGroup
                    value={sendMode}
                    onValueChange={(v) => setSendMode(v as AiChatterSendMode)}
                    disabled={engagementProfile === 'whale_whisper'}
                  >
                    <div className="flex items-start gap-2 rounded-lg border border-border p-3">
                      <RadioGroupItem value="queue_review" id="m1" className="mt-1" />
                      <label htmlFor="m1" className="cursor-pointer text-sm leading-snug">
                        <span className="font-medium">{t('chatterPage.settings.modeQueueTitle')}</span>
                        <span className="block text-muted-foreground">{t('chatterPage.settings.modeQueueDesc')}</span>
                      </label>
                    </div>
                    <div className="flex items-start gap-2 rounded-lg border border-border p-3">
                      <RadioGroupItem value="auto_send_opt_in" id="m2" className="mt-1" />
                      <label htmlFor="m2" className="cursor-pointer text-sm leading-snug">
                        <span className="font-medium">{t('chatterPage.settings.modeOptInTitle')}</span>
                        <span className="block text-muted-foreground">{t('chatterPage.settings.modeOptInDesc')}</span>
                      </label>
                    </div>
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                      <RadioGroupItem value="experimental_auto" id="m3" className="mt-1" />
                      <label htmlFor="m3" className="cursor-pointer text-sm leading-snug">
                        <span className="font-medium">{t('chatterPage.settings.modeExperimentalTitle')}</span>
                        <span className="block text-muted-foreground">{t('chatterPage.settings.modeExperimentalDesc')}</span>
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
                      {t('chatterPage.settings.ackAutoRisk')}
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="bypass"
                      checked={bypassMimic}
                      onCheckedChange={(c) => setBypassMimic(c === true)}
                    />
                    <label htmlFor="bypass" className="text-sm leading-snug cursor-pointer">
                      {t('chatterPage.settings.bypassMimic')}
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notify"
                      checked={notifyRisk}
                      onCheckedChange={(c) => setNotifyRisk(c === true)}
                    />
                    <label htmlFor="notify" className="text-sm cursor-pointer">
                      {t('chatterPage.settings.notifyRisk')}
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="whale"
                      checked={whaleTone}
                      onCheckedChange={(c) => setWhaleTone(c === true)}
                    />
                    <label htmlFor="whale" className="text-sm cursor-pointer">
                      {t('chatterPage.settings.whaleTone')}
                    </label>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('chatterPage.settings.maxReplies')}</Label>
                    <Input value={maxReplies} onChange={(e) => setMaxReplies(e.target.value)} inputMode="numeric" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('chatterPage.settings.minMinutes')}</Label>
                    <Input value={minMinutes} onChange={(e) => setMinMinutes(e.target.value)} inputMode="numeric" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('chatterPage.settings.escalationKeywords')}</Label>
                  <Textarea
                    value={keywordsText}
                    onChange={(e) => setKeywordsText(e.target.value)}
                    className="min-h-[80px] font-mono text-xs"
                    placeholder={t('chatterPage.settings.escalationPlaceholder')}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button disabled={saving} onClick={() => void saveSettings()}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('chatterPage.settings.save')}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => void activateThread(false)}
                  >
                    {t('chatterPage.settings.refreshThread')}
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className="gap-1"
                    disabled={saving}
                    onClick={() => void activateThread(true)}
                  >
                    <Play className="h-4 w-4" />
                    {t('chatterPage.settings.primeActive')}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    disabled={saving}
                    onClick={() => void deleteAutomation()}
                    aria-label={t('chatterPage.settings.deleteAria')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  {t('chatterPage.settings.openThreadLead')}{' '}
                  <Link
                    className="text-primary underline"
                    href={`/dashboard/messages?fanId=${encodeURIComponent(selected.platform_fan_id)}`}
                  >
                    {t('chatterPage.settings.openThreadLink')}
                  </Link>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">{t('chatterPage.activity.title')}</CardTitle>
          <CardDescription>
            {selected ? t('chatterPage.activity.descSelected') : t('chatterPage.activity.descAll')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-72 space-y-2 overflow-y-auto text-sm">
            {eventsForSelected.length === 0 ? (
              <p className="text-muted-foreground">{t('chatterPage.activity.empty')}</p>
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

function AiChatterPageFallback() {
  const t = useTranslations('ai-tools')
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 p-8 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="text-sm">{t('chatterPage.loading')}</span>
    </div>
  )
}

export default function AiChatterDashboardPage() {
  return (
    <Suspense fallback={<AiChatterPageFallback />}>
      <AiChatterDashboardInner />
    </Suspense>
  )
}
