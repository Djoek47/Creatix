'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Send, Loader2, Check, AlertCircle, Users, Megaphone, DollarSign, Paperclip, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { FanslyEmailTwofaDialog } from '@/components/fansly/fansly-email-twofa-dialog'
import { isFanslyEmailTwofaGraceActive } from '@/lib/fansly/fansly-twofa-session-grace'

interface ConnectedPlatform {
  platform: string
  platform_username: string
  is_connected: boolean
}

type MassPostBody = {
  message: string
  platforms: string[]
  filter?: string
  price?: number
  mediaIds?: string[]
  /** Merged from manual text + Fansly uploads before POST. */
  fanslyMediaIds?: string[]
  userLists?: string[]
}

export type MassMessageComposerProps = {
  /** When false, data loading and list fetches are skipped */
  active: boolean
  /** Full page: keep draft when navigating; dialog: reset when opening */
  embedded?: boolean
  className?: string
  /** Controlled message (e.g. mass page injects segment angle) */
  message?: string
  onMessageChange?: (value: string) => void
}

export function MassMessageComposer({
  active,
  embedded = false,
  className,
  message: controlledMessage,
  onMessageChange,
}: MassMessageComposerProps) {
  const tm = useTranslations('massCampaign')
  const [internalMessage, setInternalMessage] = useState('')
  const message = controlledMessage !== undefined ? controlledMessage : internalMessage
  const setMessage = onMessageChange ?? setInternalMessage
  const [platforms, setPlatforms] = useState<string[]>([])
  const [connectedPlatforms, setConnectedPlatforms] = useState<ConnectedPlatform[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'renewing'>('all')
  const [price, setPrice] = useState<string>('')
  const [mediaIds, setMediaIds] = useState<string[]>([])
  const [fanslyMediaIdsText, setFanslyMediaIdsText] = useState('')
  const [fanslyUploadedIds, setFanslyUploadedIds] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadingFansly, setUploadingFansly] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fanslyFileInputRef = useRef<HTMLInputElement>(null)
  const [isSending, setIsSending] = useState(false)
  const [ofUserLists, setOfUserLists] = useState<{ id: string; name: string }[]>([])
  const [selectedListIds, setSelectedListIds] = useState<string[]>([])
  const [listsLoading, setListsLoading] = useState(false)
  const [results, setResults] = useState<{
    success: boolean
    totalSent: number
    totalFailed: number
    results: Record<string, { success: boolean; sent?: number; failed?: number; error?: string }>
  } | null>(null)

  const [fanslyTwofaOpen, setFanslyTwofaOpen] = useState(false)
  const pendingMassBodyRef = useRef<MassPostBody | null>(null)

  const supabase = useMemo(() => createClient(), [])
  const t = useTranslations('messages.layout')

  useEffect(() => {
    async function loadPlatforms() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('platform_connections')
        .select('platform, platform_username, is_connected')
        .eq('user_id', user.id)
        .eq('is_connected', true)

      if (data && data.length > 0) {
        setConnectedPlatforms(data)
        setPlatforms(data.map((p) => p.platform))
      }
    }
    if (active) {
      void loadPlatforms()
      if (!embedded) {
        setResults(null)
        setMessage('')
        setPrice('')
        setMediaIds([])
        setFanslyMediaIdsText('')
        setFanslyUploadedIds([])
        setSelectedListIds([])
        setOfUserLists([])
      }
    }
  }, [active, embedded, supabase])

  useEffect(() => {
    async function loadOfLists() {
      if (!active || !platforms.includes('onlyfans')) return
      setListsLoading(true)
      try {
        const res = await fetch('/api/onlyfans/user-lists?limit=100')
        const raw = await res.json()
        if (!res.ok) return
        const arr = (raw as { data?: unknown }).data ?? (raw as { lists?: unknown }).lists ?? raw
        const list = Array.isArray(arr) ? arr : []
        setOfUserLists(
          list
            .map((row: unknown) => {
              if (!row || typeof row !== 'object') return null
              const r = row as Record<string, unknown>
              const id = r.id != null ? String(r.id) : ''
              const name = r.name != null ? String(r.name) : id
              return id ? { id, name } : null
            })
            .filter((x): x is { id: string; name: string } => x != null),
        )
      } catch {
        setOfUserLists([])
      } finally {
        setListsLoading(false)
      }
    }
    if (active) void loadOfLists()
  }, [active, platforms])

  const togglePlatform = (platform: string) => {
    setPlatforms((prev) => (prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]))
  }

  const toggleListId = (id: string) => {
    setSelectedListIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    try {
      const { uploadLocalFileToOnlyFansMedia } = await import('@/lib/onlyfans-upload-client')
      for (let i = 0; i < files.length; i++) {
        const data = await uploadLocalFileToOnlyFansMedia(files[i])
        if (data.id) setMediaIds((prev) => [...prev, data.id])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleFanslyFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setUploadingFansly(true)
    try {
      const { uploadLocalFileToFanslyMedia } = await import('@/lib/fansly-upload-client')
      for (let i = 0; i < files.length; i++) {
        const data = await uploadLocalFileToFanslyMedia(files[i])
        if (data.id) setFanslyUploadedIds((prev) => [...prev, data.id])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUploadingFansly(false)
      e.target.value = ''
    }
  }

  const parseFanslyMediaIds = () =>
    fanslyMediaIdsText
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)

  const buildMassPostBody = (): MassPostBody => {
    const priceNum = price.trim() ? parseFloat(price) : undefined
    const body: MassPostBody = {
      message,
      platforms,
      filter,
    }
    if (priceNum != null && !Number.isNaN(priceNum) && priceNum >= 0) body.price = priceNum
    if (mediaIds.length > 0) body.mediaIds = mediaIds
    const flMerged = Array.from(new Set([...fanslyUploadedIds, ...parseFanslyMediaIds()]))
    if (flMerged.length > 0) body.fanslyMediaIds = flMerged
    if (platforms.includes('onlyfans') && selectedListIds.length > 0) body.userLists = selectedListIds
    return body
  }

  const executeMassPost = async (body: MassPostBody) => {
    const response = await fetch('/api/messages/mass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await response.json()

    if (response.ok && data.success !== false) {
      setResults({
        success: data.success !== false,
        totalSent: data.totalSent ?? 0,
        totalFailed: data.totalFailed ?? 0,
        results: data.results ?? {},
      })
    } else {
      setResults({
        success: false,
        totalSent: data.totalSent ?? 0,
        totalFailed: 1,
        results: {
          request: { success: false, error: data.error || tm('composer.sendFailedGeneric') },
        },
      })
    }
  }

  const handleSend = async () => {
    if (!message || platforms.length === 0) return

    const body = buildMassPostBody()
    const priceNum = price.trim() ? parseFloat(price) : undefined
    const fanslyIds = Array.from(new Set([...fanslyUploadedIds, ...parseFanslyMediaIds()]))
    const fanslyEffectiveMedia =
      fanslyIds.length > 0
        ? fanslyIds
        : platforms.length === 1 && platforms[0] === 'fansly' && mediaIds.length > 0
          ? mediaIds
          : []
    if (
      platforms.includes('fansly') &&
      typeof priceNum === 'number' &&
      priceNum > 0 &&
      fanslyEffectiveMedia.length === 0
    ) {
      setResults({
        success: false,
        totalSent: 0,
        totalFailed: 1,
        results: {
          request: {
            success: false,
            error: tm('composer.paidFanslyValidation'),
          },
        },
      })
      return
    }

    const needsFanslyTwofa =
      platforms.includes('fansly') && typeof window !== 'undefined' && !isFanslyEmailTwofaGraceActive()

    if (needsFanslyTwofa) {
      pendingMassBodyRef.current = body
      setFanslyTwofaOpen(true)
      return
    }

    setIsSending(true)
    setResults(null)
    try {
      await executeMassPost(body)
    } catch {
      setResults({
        success: false,
        totalSent: 0,
        totalFailed: platforms.length,
        results: {
          request: { success: false, error: tm('composer.networkError') },
        },
      })
    } finally {
      setIsSending(false)
    }
  }

  const platformConfig: Record<string, { label: string; color: string }> = {
    onlyfans: { label: tm('audience.platformOnlyfans'), color: '#00AFF0' },
    fansly: { label: tm('audience.platformFansly'), color: '#009FFF' },
  }

  const inner = (
    <>
    <div className={`space-y-6 py-4 ${className ?? ''}`}>
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">{tm('composer.messageLabel')}</Label>
        <Textarea
          placeholder={tm('composer.messagePlaceholder')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-32 rounded-2xl border-border/50 bg-background/80 text-[15px] leading-relaxed"
        />
        <p className="text-[11px] text-muted-foreground">{tm('composer.charCount', { count: message.length })}</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-border/40 bg-muted/20 p-5">
        <div>
          <p className="text-sm font-light tracking-tight text-foreground">{tm('composer.ppvTitle')}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tm('composer.ppvHint')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder={tm('composer.pricePlaceholder')}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-9 w-28 rounded-xl border-border/50 bg-background/80"
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl"
            disabled={uploading || !platforms.includes('onlyfans')}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            {uploading ? tm('composer.uploadingOf') : tm('composer.attachOf')}
          </Button>
        </div>
        {mediaIds.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {mediaIds.map((id) => (
              <Badge key={id} variant="secondary" className="gap-1 rounded-full font-mono text-[10px] font-normal">
                {id.slice(0, 8)}…
                <button type="button" aria-label={tm('composer.removeMediaAria')} onClick={() => setMediaIds((p) => p.filter((x) => x !== id))}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        {platforms.includes('fansly') && (
          <div className="mt-4 space-y-3 border-t border-border/30 pt-4">
            <input
              ref={fanslyFileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFanslyFileUpload}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-xl"
                disabled={uploadingFansly}
                onClick={() => fanslyFileInputRef.current?.click()}
              >
                {uploadingFansly ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {uploadingFansly ? tm('composer.uploadingFansly') : tm('composer.attachFansly')}
              </Button>
              {fanslyUploadedIds.map((id) => (
                <Badge key={id} variant="secondary" className="gap-1 rounded-full font-mono text-[10px] font-normal">
                  {id.slice(0, 10)}…
                  <button type="button" aria-label={tm('composer.removeMediaAria')} onClick={() => setFanslyUploadedIds((p) => p.filter((x) => x !== id))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">{tm('composer.fanslyIdsLabel')}</Label>
              <Input
                value={fanslyMediaIdsText}
                onChange={(e) => setFanslyMediaIdsText(e.target.value)}
                placeholder={tm('composer.fanslyIdsPlaceholder')}
                className="rounded-xl border-border/50 bg-background/80 font-mono text-xs"
              />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{tm('composer.fanslyDualHint')}</p>
          </div>
        )}
        {!platforms.includes('onlyfans') && platforms.length > 0 && !platforms.includes('fansly') && (
          <p className="text-xs leading-relaxed text-muted-foreground">{tm('composer.ofOnlyMediaHint')}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>{t('sendToPlatforms')}</Label>
        {connectedPlatforms.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noPlatformsConnected')}</p>
        ) : (
          <div className="space-y-2">
            {connectedPlatforms.map((platform) => {
              const config = platformConfig[platform.platform] || {
                label: platform.platform,
                color: '#888',
              }
              return (
                <div key={platform.platform} className="flex items-center space-x-3">
                  <Checkbox
                    id={`mass-${platform.platform}`}
                    checked={platforms.includes(platform.platform)}
                    onCheckedChange={() => togglePlatform(platform.platform)}
                  />
                  <div className="flex flex-1 items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: config.color }} />
                    <Label htmlFor={`mass-${platform.platform}`} className="cursor-pointer">
                      {config.label}
                    </Label>
                    <Badge variant="outline" className="ml-auto text-xs">
                      @{platform.platform_username}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>{t('sendTo')}</Label>
        <Select value={filter} onValueChange={(v: typeof filter) => setFilter(v)}>
          <SelectTrigger className="rounded-xl border-border/50 bg-background/80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {tm('composer.filterAll')}
              </div>
            </SelectItem>
            <SelectItem value="active">{tm('composer.filterActive')}</SelectItem>
            <SelectItem value="expired">{tm('composer.filterExpired')}</SelectItem>
            <SelectItem value="renewing">{tm('composer.filterRenewing')}</SelectItem>
          </SelectContent>
        </Select>
        {platforms.includes('onlyfans') && (
          <div className="space-y-2 rounded-2xl border border-border/40 bg-muted/20 p-4">
            <p className="text-xs font-medium text-foreground">{tm('composer.ofListsTitle')}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{tm('composer.ofListsHint')}</p>
            {listsLoading ? (
              <p className="text-xs text-muted-foreground">{tm('composer.listsLoading')}</p>
            ) : ofUserLists.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('noListsFound')}</p>
            ) : (
              <div className="max-h-36 space-y-2 overflow-y-auto">
                {ofUserLists.map((l) => (
                  <div key={l.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`of-list-${l.id}`}
                      checked={selectedListIds.includes(l.id)}
                      onCheckedChange={() => toggleListId(l.id)}
                    />
                    <Label htmlFor={`of-list-${l.id}`} className="cursor-pointer truncate text-xs font-normal">
                      {l.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {results && (
        <div
          className={`rounded-2xl border p-5 ${
            results.success ? 'border-emerald-500/20 bg-emerald-500/[0.06]' : 'border-destructive/20 bg-destructive/[0.06]'
          }`}
        >
          <div className="mb-2 flex items-center gap-2">
            {results.success ? (
              <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-destructive" />
            )}
            <span className="text-sm font-medium tracking-tight">
              {results.success ? tm('composer.resultsTitleOk') : tm('composer.resultsTitlePartial')}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {tm('composer.resultsReach', { sent: results.totalSent })}
            {results.totalFailed > 0 ? tm('composer.resultsFailedSuffix', { failed: results.totalFailed }) : ''}
          </p>
          {results.results &&
            Object.entries(results.results).map(([platform, result]) => (
              <div key={platform} className="mt-3 flex items-center gap-2 text-sm">
                {result.success ? (
                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
                <span className="capitalize">{platform}</span>
                {result.sent != null && result.sent > 0 ? (
                  <span className="text-muted-foreground">({tm('composer.sentCountLabel', { count: result.sent })})</span>
                ) : null}
                {result.error && <span className="text-xs text-destructive">{result.error}</span>}
              </div>
            ))}
        </div>
      )}

      <Button
        className="h-11 w-full gap-2 rounded-xl font-medium shadow-sm"
        onClick={handleSend}
        disabled={isSending || !message || platforms.length === 0}
      >
        {isSending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {tm('composer.sendingStatus')}
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            {tm('composer.sendCta', { count: platforms.length })}
          </>
        )}
      </Button>
    </div>

    <FanslyEmailTwofaDialog
      open={fanslyTwofaOpen}
      onOpenChange={(open) => {
        setFanslyTwofaOpen(open)
        if (!open) pendingMassBodyRef.current = null
      }}
      onVerified={async () => {
        const toSend = pendingMassBodyRef.current
        if (!toSend) return
        pendingMassBodyRef.current = null
        setFanslyTwofaOpen(false)
        setIsSending(true)
        setResults(null)
        try {
          await executeMassPost(toSend)
        } catch {
          setResults({
            success: false,
            totalSent: 0,
            totalFailed: toSend.platforms.length,
            results: {
              request: { success: false, error: tm('composer.networkError') },
            },
          })
        } finally {
          setIsSending(false)
        }
      }}
    />
    </>
  )

  if (embedded) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-6 space-y-2 border-b border-border/30 pb-6">
          <h3 className="flex items-center gap-2 text-xl font-light tracking-tight">
            <Megaphone className="h-5 w-5 text-muted-foreground" />
            {tm('embedded.title')}
          </h3>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{tm('embedded.subtitle')}</p>
        </div>
        {inner}
      </div>
    )
  }

  return inner
}
