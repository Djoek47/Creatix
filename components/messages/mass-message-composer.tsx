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

interface ConnectedPlatform {
  platform: string
  platform_username: string
  is_connected: boolean
}

type VaultVideoRow = {
  id: string
  title: string | null
  content_type: string
  file_url: string | null
  vault_storage_path?: string | null
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
  const [internalMessage, setInternalMessage] = useState('')
  const message = controlledMessage !== undefined ? controlledMessage : internalMessage
  const setMessage = onMessageChange ?? setInternalMessage
  const [platforms, setPlatforms] = useState<string[]>([])
  const [connectedPlatforms, setConnectedPlatforms] = useState<ConnectedPlatform[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'renewing'>('all')
  const [price, setPrice] = useState<string>('')
  const [mediaIds, setMediaIds] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isSending, setIsSending] = useState(false)
  const [traceEnabled, setTraceEnabled] = useState(false)
  const [traceContentId, setTraceContentId] = useState('')
  const [traceRecipientKeyPrefix, setTraceRecipientKeyPrefix] = useState('mass')
  const [recipientIdsCsv, setRecipientIdsCsv] = useState('')
  const [traceVaultRows, setTraceVaultRows] = useState<VaultVideoRow[]>([])
  const [traceVaultLoading, setTraceVaultLoading] = useState(false)
  const [ofUserLists, setOfUserLists] = useState<{ id: string; name: string }[]>([])
  const [selectedListIds, setSelectedListIds] = useState<string[]>([])
  const [listsLoading, setListsLoading] = useState(false)
  const [results, setResults] = useState<{
    success: boolean
    totalSent: number
    totalFailed: number
    results: Record<string, { success: boolean; sent?: number; failed?: number; error?: string }>
  } | null>(null)

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
        setTraceEnabled(false)
        setTraceContentId('')
        setTraceRecipientKeyPrefix('mass')
        setRecipientIdsCsv('')
        setTraceVaultRows([])
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

  useEffect(() => {
    if (!active || !traceEnabled) return
    let cancelled = false
    setTraceVaultLoading(true)
    void (async () => {
      try {
        const res = await fetch('/api/content/vault')
        const json = (await res.json()) as { items?: VaultVideoRow[] }
        if (!res.ok || cancelled) return
        const list = Array.isArray(json.items) ? json.items : []
        const videos = list.filter((row) => row.content_type === 'video' && (row.file_url || row.vault_storage_path))
        if (cancelled) return
        setTraceVaultRows(videos)
        if (!traceContentId && videos.length > 0) setTraceContentId(videos[0].id)
      } catch {
        if (!cancelled) setTraceVaultRows([])
      } finally {
        if (!cancelled) setTraceVaultLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [active, traceEnabled, traceContentId])

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

  const handleSend = async () => {
    if (!message || platforms.length === 0) return

    setIsSending(true)
    setResults(null)

    const priceNum = price.trim() ? parseFloat(price) : undefined
    const body: {
      message: string
      platforms: string[]
      filter?: string
      price?: number
      mediaIds?: string[]
      userLists?: string[]
      userIds?: string[]
      trace?: {
        enabled: boolean
        contentId: string
        recipientKeyPrefix?: string
      }
    } = {
      message,
      platforms,
      filter,
    }
    if (priceNum != null && !Number.isNaN(priceNum) && priceNum >= 0) body.price = priceNum
    if (mediaIds.length > 0) body.mediaIds = mediaIds
    if (platforms.includes('onlyfans') && selectedListIds.length > 0) body.userLists = selectedListIds
    const explicitRecipientIds = recipientIdsCsv
      .split(/[\s,]+/)
      .map((value) => value.trim())
      .filter(Boolean)
    if (explicitRecipientIds.length > 0) body.userIds = explicitRecipientIds
    if (traceEnabled) {
      body.trace = {
        enabled: true,
        contentId: traceContentId,
        recipientKeyPrefix: traceRecipientKeyPrefix.trim() || undefined,
      }
    }

    try {
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
            request: { success: false, error: data.error || 'Failed to send' },
          },
        })
      }
    } catch {
      setResults({
        success: false,
        totalSent: 0,
        totalFailed: platforms.length,
        results: {
          request: { success: false, error: 'Network error' },
        },
      })
    }
    setIsSending(false)
  }

  const platformConfig: Record<string, { label: string; color: string }> = {
    onlyfans: { label: 'OnlyFans', color: '#00AFF0' },
    fansly: { label: 'Fansly', color: '#009FFF' },
  }

  const inner = (
    <div className={`space-y-4 py-4 ${className ?? ''}`}>
      <div className="space-y-2">
        <Label>Message</Label>
        <Textarea
          placeholder="Type your message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-32"
        />
        <p className="text-xs text-muted-foreground">{message.length} characters</p>
      </div>

      <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-xs font-medium text-foreground">Optional: paid (PPV) content</p>
        <p className="text-xs text-muted-foreground">
          Attach media and/or set a price so fans pay to unlock this message. Leave price empty for a free message.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="Price (e.g. 4.99)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-28"
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
            disabled={uploading || !platforms.includes('onlyfans')}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            {uploading ? 'Uploading…' : 'Attach media (OnlyFans)'}
          </Button>
        </div>
        {mediaIds.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {mediaIds.map((id) => (
              <Badge key={id} variant="secondary" className="gap-1">
                {id.slice(0, 8)}…
                <button type="button" aria-label="Remove" onClick={() => setMediaIds((p) => p.filter((x) => x !== id))}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        {!platforms.includes('onlyfans') && platforms.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Media upload is available when OnlyFans is selected. Fansly media can be added when supported.
          </p>
        )}
      </div>

      <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-foreground">Ariadne trace per recipient</p>
            <p className="text-xs text-muted-foreground">
              When enabled, each recipient ID generates a unique traced file and credit charge.
            </p>
          </div>
          <Button
            type="button"
            variant={traceEnabled ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setTraceEnabled((v) => !v)}
          >
            {traceEnabled ? 'Trace ON' : 'Trace OFF'}
          </Button>
        </div>
        {traceEnabled ? (
          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Trace source video</Label>
              <Select value={traceContentId} onValueChange={setTraceContentId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={traceVaultLoading ? 'Loading vault…' : 'Select video'} />
                </SelectTrigger>
                <SelectContent>
                  {traceVaultRows.map((row) => (
                    <SelectItem key={row.id} value={row.id}>
                      {(row.title || 'Untitled').slice(0, 50)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Recipient key prefix</Label>
              <Input
                value={traceRecipientKeyPrefix}
                onChange={(e) => setTraceRecipientKeyPrefix(e.target.value)}
                placeholder="mass"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Recipient IDs (required for exact per-recipient trace)</Label>
              <Textarea
                value={recipientIdsCsv}
                onChange={(e) => setRecipientIdsCsv(e.target.value)}
                className="min-h-20"
                placeholder="Paste OnlyFans user IDs, comma or line separated"
              />
            </div>
          </div>
        ) : null}
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
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                All Subscribers
              </div>
            </SelectItem>
            <SelectItem value="active">Active Subscribers Only</SelectItem>
            <SelectItem value="expired">Expired Subscribers Only</SelectItem>
            <SelectItem value="renewing">Auto-Renewing Subscribers</SelectItem>
          </SelectContent>
        </Select>
        {platforms.includes('onlyfans') && (
          <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-xs font-medium">OnlyFans user lists (optional)</p>
            <p className="text-xs text-muted-foreground">
              Target specific lists instead of the subscriber filter above. Leave empty to use the filter.
            </p>
            {listsLoading ? (
              <p className="text-xs text-muted-foreground">Loading lists…</p>
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
        <div className={`rounded-lg p-4 ${results.success ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
          <div className="mb-2 flex items-center gap-2">
            {results.success ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-destructive" />
            )}
            <span className="font-medium">{results.success ? 'Messages Sent!' : 'Partial Success'}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Sent to {results.totalSent} subscribers
            {results.totalFailed > 0 && `, ${results.totalFailed} failed`}
          </p>
          {results.results &&
            Object.entries(results.results).map(([platform, result]) => (
              <div key={platform} className="mt-2 flex items-center gap-2 text-sm">
                {result.success ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
                <span className="capitalize">{platform}</span>
                {result.sent && <span className="text-muted-foreground">({result.sent} sent)</span>}
                {result.error && <span className="text-xs text-destructive">{result.error}</span>}
              </div>
            ))}
        </div>
      )}

      <Button
        className="w-full gap-2"
        onClick={handleSend}
        disabled={
          isSending ||
          !message ||
          platforms.length === 0 ||
          (traceEnabled && (!traceContentId || recipientIdsCsv.trim().length === 0))
        }
        style={{
          background: platforms.length > 0 && message ? 'linear-gradient(135deg, #00AFF0, #009FFF)' : undefined,
        }}
      >
        {isSending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending to {platforms.length} platform(s)...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Send to All ({platforms.length})
          </>
        )}
      </Button>
    </div>
  )

  if (embedded) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-2">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Megaphone className="h-5 w-5" />
            Send mass message
          </h3>
          <p className="text-sm text-muted-foreground">
            OnlyFans and Fansly support paid (PPV) content: attach media and set a price so fans pay to unlock.
          </p>
        </div>
        {inner}
      </div>
    )
  }

  return inner
}
