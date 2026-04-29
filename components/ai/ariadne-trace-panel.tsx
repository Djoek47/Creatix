'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PlatformWordmark } from '@/components/platform/platform-wordmark'
import { Loader2, Search, Shield, Upload, Video } from 'lucide-react'
import { formatToolCreditCost } from '@/lib/billing/credit-economics'
import { uiFadeTransition, uiPanelTransition, useUiMotionPreferences } from '@/components/ui/motion-presets'

type VaultRow = {
  id: string
  title: string | null
  content_type: string
  file_url: string | null
  vault_storage_path?: string | null
}

type AriadneExportRow = {
  id: string
  content_id: string
  content_title: string | null
  recipient_key: string
  recipient_platform: 'onlyfans' | 'fansly' | null
  recipient_platform_fan_id: string | null
  recipient_username: string | null
  recipient_display_name: string | null
  source: 'vault_standalone' | 'frame_export' | 'message_send' | 'mass_dm'
  payload_id: string
  created_at: string
}

type AriadneExportDetail = {
  export: AriadneExportRow
  downloadUrl: string | null
}

type ViewMode = 'create' | 'library' | 'detect'

export function AriadneTracePanel() {
  const { reduced } = useUiMotionPreferences()
  const fadeTransition = uiFadeTransition(reduced)
  const panelTransition = uiPanelTransition(reduced)
  const [viewMode, setViewMode] = useState<ViewMode>('create')
  const [advancedMode, setAdvancedMode] = useState(false)

  const [items, setItems] = useState<VaultRow[]>([])
  const [loading, setLoading] = useState(true)
  const [contentId, setContentId] = useState<string>('')
  const [recipientKey, setRecipientKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const [recipientPlatform, setRecipientPlatform] = useState<'onlyfans' | 'fansly' | ''>('')
  const [recipientPlatformFanId, setRecipientPlatformFanId] = useState('')
  const [recipientUsername, setRecipientUsername] = useState('')
  const [recipientDisplayName, setRecipientDisplayName] = useState('')

  const [traceRows, setTraceRows] = useState<AriadneExportRow[]>([])
  const [traceLoading, setTraceLoading] = useState(false)
  const [traceQuery, setTraceQuery] = useState('')
  const [traceSource, setTraceSource] = useState<'all' | 'vault_standalone' | 'frame_export' | 'message_send' | 'mass_dm'>('all')
  const [traceCursor, setTraceCursor] = useState('0')
  const [traceNextCursor, setTraceNextCursor] = useState<string | null>(null)
  const [traceSelectedId, setTraceSelectedId] = useState<string | null>(null)
  const [traceDetailLoading, setTraceDetailLoading] = useState(false)
  const [traceDetail, setTraceDetail] = useState<AriadneExportDetail | null>(null)

  const [detectBusy, setDetectBusy] = useState(false)
  const [detectResult, setDetectResult] = useState<string | null>(null)

  const loadVault = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/content/vault')
      const j = (await res.json()) as { items?: VaultRow[] }
      if (!res.ok) {
        setItems([])
        return
      }
      const list = Array.isArray(j.items) ? j.items : []
      setItems(list.filter((r) => r.content_type === 'video' && (r.file_url || r.vault_storage_path)))
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadVault()
  }, [loadVault])

  const selectedVaultTitle = useMemo(() => {
    const found = items.find((row) => row.id === contentId)
    return found?.title || 'Untitled'
  }, [items, contentId])

  const loadTraceRows = useCallback(async (cursor = '0') => {
    setTraceLoading(true)
    try {
      const params = new URLSearchParams({
        limit: '25',
        cursor,
      })
      if (traceQuery.trim()) params.set('query', traceQuery.trim())
      if (traceSource !== 'all') params.set('source', traceSource)
      const res = await fetch(`/api/ariadne/exports?${params.toString()}`)
      const json = (await res.json()) as {
        exports?: AriadneExportRow[]
        page?: { nextCursor?: string | null; cursor?: string }
      }
      if (!res.ok) {
        setTraceRows([])
        setTraceNextCursor(null)
        return
      }
      setTraceRows(Array.isArray(json.exports) ? json.exports : [])
      setTraceCursor(json.page?.cursor ?? cursor)
      setTraceNextCursor(json.page?.nextCursor ?? null)
    } catch {
      setTraceRows([])
      setTraceNextCursor(null)
    } finally {
      setTraceLoading(false)
    }
  }, [traceQuery, traceSource])

  useEffect(() => {
    if (viewMode === 'library') void loadTraceRows('0')
  }, [viewMode, loadTraceRows])

  const loadTraceDetail = useCallback(async (id: string) => {
    setTraceSelectedId(id)
    setTraceDetailLoading(true)
    try {
      const res = await fetch(`/api/ariadne/exports/${id}`)
      const json = (await res.json()) as AriadneExportDetail
      if (!res.ok) {
        setTraceDetail(null)
        return
      }
      setTraceDetail(json)
    } catch {
      setTraceDetail(null)
    } finally {
      setTraceDetailLoading(false)
    }
  }, [])

  async function runEmbed() {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/ariadne/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          recipientKey: recipientKey.trim(),
          source: 'vault_standalone',
          recipient: advancedMode
            ? {
                platform: recipientPlatform || undefined,
                platformFanId: recipientPlatformFanId.trim() || undefined,
                username: recipientUsername.trim() || undefined,
                displayName: recipientDisplayName.trim() || undefined,
              }
            : undefined,
          updateContentRow: false,
        }),
      })
      const j = (await res.json()) as { error?: string; payloadId?: string; exportId?: string }
      if (!res.ok) {
        setMsg(j.error || 'Trace failed')
        return
      }
      setMsg(
        `Trace created. Payload ${j.payloadId ?? 'ok'}${j.exportId ? ` (Export ${j.exportId.slice(0, 8)}…)` : ''}.`,
      )
      if (viewMode === 'library') void loadTraceRows('0')
    } catch {
      setMsg('Network error')
    } finally {
      setBusy(false)
    }
  }

  async function runDetect(file: File | null) {
    if (!file) return
    setDetectBusy(true)
    setDetectResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/ariadne/detect', { method: 'POST', body: fd })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) {
        setDetectResult(j.error || 'Detect failed')
        return
      }
      setDetectResult(JSON.stringify(j, null, 2))
    } catch {
      setDetectResult('Network error')
    } finally {
      setDetectBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2 sm:text-[1.9rem]">
          <Shield className="h-7 w-7 text-circe" />
          Ariadne Trace
        </h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
          Per-recipient forensic marker with full trace library. Create, review, preview, and download exact files per
          recipient. Charges {formatToolCreditCost('ariadne-trace')} per embed; {formatToolCreditCost('ariadne-detect')} per
          detection.
        </p>
      </div>

      <motion.div layout transition={panelTransition} className="grid gap-2.5 sm:grid-cols-3">
        <Button variant={viewMode === 'create' ? 'default' : 'outline'} onClick={() => setViewMode('create')}>
          Create Trace
        </Button>
        <Button variant={viewMode === 'library' ? 'default' : 'outline'} onClick={() => setViewMode('library')}>
          Trace Library
        </Button>
        <Button variant={viewMode === 'detect' ? 'default' : 'outline'} onClick={() => setViewMode('detect')}>
          Detect Marker
        </Button>
      </motion.div>

      <AnimatePresence mode="wait" initial={false}>
      {viewMode === 'create' ? (
        <motion.div
          key="ariadne-create"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={fadeTransition}
        >
        <Card className="rounded-xl border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle className="text-lg">Create per-recipient trace</CardTitle>
            <CardDescription>Run one trace per recipient with exact attribution key.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4.5">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading vault…
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Vault video</Label>
                <Select value={contentId} onValueChange={setContentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a video" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.title || 'Untitled'} ({r.id.slice(0, 8)}…)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient key</Label>
              <Input
                id="recipient"
                placeholder="Exact user key: username, platform id, or internal fan id"
                value={recipientKey}
                onChange={(e) => setRecipientKey(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 p-3.5">
              <div>
                <p className="text-sm font-medium">Advanced recipient mapping</p>
                <p className="text-xs text-muted-foreground">Optional structured fields for fan joins and audits.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setAdvancedMode((v) => !v)}>
                {advancedMode ? 'Hide Advanced' : 'Show Advanced'}
              </Button>
            </div>

            {advancedMode ? (
              <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3.5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select
                    value={recipientPlatform || 'none'}
                    onValueChange={(value) =>
                      setRecipientPlatform(value === 'none' ? '' : (value as 'onlyfans' | 'fansly'))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" textValue="No platform">
                        <span className="text-[14px] text-muted-foreground">No platform</span>
                      </SelectItem>
                      <SelectItem value="onlyfans" textValue="OnlyFans">
                        <span className="flex items-center gap-3 py-0.5">
                          <PlatformWordmark platform="onlyfans" size="md" />
                          <span className="text-[14px] font-medium text-foreground">OnlyFans</span>
                        </span>
                      </SelectItem>
                      <SelectItem value="fansly" textValue="Fansly">
                        <span className="flex items-center gap-3 py-0.5">
                          <PlatformWordmark platform="fansly" size="md" />
                          <span className="text-[14px] font-medium text-foreground">Fansly</span>
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Platform fan ID</Label>
                  <Input value={recipientPlatformFanId} onChange={(e) => setRecipientPlatformFanId(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input value={recipientUsername} onChange={(e) => setRecipientUsername(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Display name</Label>
                  <Input value={recipientDisplayName} onChange={(e) => setRecipientDisplayName(e.target.value)} />
                </div>
              </div>
            ) : null}

            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Selected file:</span> {selectedVaultTitle}
              </p>
              <p>
                <span className="font-medium text-foreground">Cost:</span> {formatToolCreditCost('ariadne-trace')} per
                recipient run.
              </p>
            </div>

            <Button type="button" disabled={busy || !contentId || !recipientKey.trim()} onClick={() => void runEmbed()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Run Ariadne trace
            </Button>
            {msg ? <p className="text-sm text-muted-foreground whitespace-pre-wrap">{msg}</p> : null}
          </CardContent>
        </Card>
        </motion.div>
      ) : null}

      {viewMode === 'library' ? (
        <motion.div
          key="ariadne-library"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={fadeTransition}
          className="grid gap-4 lg:grid-cols-[1.1fr,1fr]"
        >
          <Card className="min-h-[32rem] rounded-xl border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle className="text-lg">Trace library</CardTitle>
              <CardDescription>Search all generated traces by recipient, content, source, and payload.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2.5 md:grid-cols-[1fr,180px,auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={traceQuery}
                    onChange={(e) => setTraceQuery(e.target.value)}
                    placeholder="Search recipient, content, payload…"
                    className="pl-9"
                  />
                </div>
                <Select value={traceSource} onValueChange={(v) => setTraceSource(v as typeof traceSource)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    <SelectItem value="vault_standalone">Vault standalone</SelectItem>
                    <SelectItem value="message_send">Message send</SelectItem>
                    <SelectItem value="mass_dm">Mass DM</SelectItem>
                    <SelectItem value="frame_export">Frame export</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => void loadTraceRows('0')} disabled={traceLoading}>
                  {traceLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Refresh
                </Button>
              </div>
              <Separator />
              <div className="max-h-[28rem] overflow-auto rounded-lg border border-border/80">
                {traceLoading ? (
                  <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading trace library…
                  </div>
                ) : traceRows.length === 0 ? (
                  <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                    No traces found for this filter.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {traceRows.map((row) => {
                      const label = row.recipient_display_name || row.recipient_username || row.recipient_platform_fan_id || row.recipient_key
                      return (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => void loadTraceDetail(row.id)}
                          className={`w-full p-3 text-left transition hover:bg-muted/40 ${
                            traceSelectedId === row.id ? 'bg-muted/50' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium">{label}</p>
                            <Badge variant="outline" className="text-[10px]">{row.source}</Badge>
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {row.content_title || row.content_id.slice(0, 8)} · Payload {row.payload_id.slice(0, 10)}…
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">{new Date(row.created_at).toLocaleString()}</p>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Cursor: {traceCursor}</p>
                <Button
                  variant="outline"
                  disabled={!traceNextCursor || traceLoading}
                  onClick={() => traceNextCursor && void loadTraceRows(traceNextCursor)}
                >
                  Next page
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="min-h-[32rem] rounded-xl border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle className="text-lg">Trace detail</CardTitle>
              <CardDescription>Preview and download the exact per-recipient file.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {traceDetailLoading ? (
                <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading trace detail…
                </div>
              ) : traceDetail ? (
                <>
                  <div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-3 text-sm">
                    <p><span className="font-medium">Recipient:</span> {traceDetail.export.recipient_display_name || traceDetail.export.recipient_username || traceDetail.export.recipient_platform_fan_id || traceDetail.export.recipient_key}</p>
                    <p><span className="font-medium">Content:</span> {traceDetail.export.content_title || traceDetail.export.content_id}</p>
                    <p><span className="font-medium">Payload:</span> {traceDetail.export.payload_id}</p>
                    <p><span className="font-medium">Source:</span> {traceDetail.export.source}</p>
                  </div>
                  {traceDetail.downloadUrl ? (
                    <div className="space-y-3">
                      <video src={traceDetail.downloadUrl} controls playsInline className="max-w-full rounded-xl object-contain border border-border bg-black/20" />
                      <div className="flex flex-wrap gap-2">
                        <Button asChild>
                          <a href={traceDetail.downloadUrl} target="_blank" rel="noreferrer">
                            <Video className="mr-2 h-4 w-4" />
                            Open
                          </a>
                        </Button>
                        <Button asChild variant="outline">
                          <a href={traceDetail.downloadUrl} download>
                            Download file
                          </a>
                        </Button>
                        <Button variant="outline" onClick={() => void navigator.clipboard.writeText(traceDetail.export.payload_id)}>
                          Copy payload ID
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No downloadable file available.</p>
                  )}
                </>
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Select a trace from the library.</div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ) : null}

      {viewMode === 'detect' ? (
        <motion.div
          key="ariadne-detect"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={fadeTransition}
        >
        <Card className="rounded-xl border-border/80 bg-card/95">
          <CardHeader>
            <CardTitle className="text-lg">Detect marker (suspected leak file)</CardTitle>
            <CardDescription>Upload a recovered video file. Ariadne scans for append-v1 payloads.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Upload className="h-4 w-4" />
              <input
                type="file"
                accept="video/*"
                className="text-sm"
                disabled={detectBusy}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void runDetect(f)
                  e.target.value = ''
                }}
              />
            </label>
            {detectBusy ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning…
              </div>
            ) : null}
            {detectResult ? (
              <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs">{detectResult}</pre>
            ) : null}
          </CardContent>
        </Card>
        </motion.div>
      ) : null}
      </AnimatePresence>
    </div>
  )
}
