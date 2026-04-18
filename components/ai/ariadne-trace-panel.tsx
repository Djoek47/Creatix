'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Shield, Upload, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatToolCreditCost } from '@/lib/billing/credit-economics'
import { cn } from '@/lib/utils'
import { AriadneDetectResult } from '@/components/ai/ariadne-detect-result'

type VaultRow = {
  id: string
  title: string | null
  content_type: string
  file_url: string | null
  vault_storage_path?: string | null
}

type ChatFan = {
  fan_id: string
  username: string | null
  display_name: string | null
  platform: string
  last_seen_at: string
}

type ExportRow = {
  id: string
  created_at: string
  recipient_key: string
  platform: string | null
  platform_fan_id: string | null
  payload_id: string
  content_id: string
  content?: { title: string | null } | null
}

export function AriadneTracePanel() {
  const searchParams = useSearchParams()
  const urlFanId = searchParams.get('fanId')?.trim() || ''
  const urlPlatform = (searchParams.get('platform') || 'onlyfans').trim().toLowerCase()

  const [items, setItems] = useState<VaultRow[]>([])
  const [loading, setLoading] = useState(true)
  const [contentId, setContentId] = useState<string>('')
  const [recipientMode, setRecipientMode] = useState<'fan' | 'custom'>('fan')
  const [fans, setFans] = useState<ChatFan[]>([])
  const [fansLoading, setFansLoading] = useState(true)
  const [fanSearch, setFanSearch] = useState('')
  const [selectedFanId, setSelectedFanId] = useState<string>('')
  const [customRecipientKey, setCustomRecipientKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [detectBusy, setDetectBusy] = useState(false)
  const [detectResponse, setDetectResponse] = useState<Record<string, unknown> | null>(null)
  const [detectError, setDetectError] = useState<string | null>(null)
  const [exportsList, setExportsList] = useState<ExportRow[]>([])
  const [exportsLoading, setExportsLoading] = useState(true)
  const [exportFilterFanId, setExportFilterFanId] = useState<string>('')

  const load = useCallback(async () => {
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

  const loadFans = useCallback(async () => {
    setFansLoading(true)
    try {
      const res = await fetch('/api/ariadne/chat-fans')
      const j = (await res.json()) as { fans?: ChatFan[]; error?: string }
      if (!res.ok) {
        setFans([])
        return
      }
      setFans(Array.isArray(j.fans) ? j.fans : [])
    } catch {
      setFans([])
    } finally {
      setFansLoading(false)
    }
  }, [])

  const loadExports = useCallback(async (platformFanId?: string) => {
    setExportsLoading(true)
    try {
      const q = platformFanId
        ? `?platformFanId=${encodeURIComponent(platformFanId)}`
        : ''
      const res = await fetch(`/api/ariadne/exports${q}`)
      const j = (await res.json()) as { exports?: ExportRow[]; error?: string }
      if (!res.ok) {
        setExportsList([])
        return
      }
      setExportsList(Array.isArray(j.exports) ? j.exports : [])
    } catch {
      setExportsList([])
    } finally {
      setExportsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    void loadFans()
    void loadExports()
  }, [load, loadFans, loadExports])

  useEffect(() => {
    if (!urlFanId) return
    setRecipientMode('fan')
    setSelectedFanId(urlFanId)
  }, [urlFanId])

  const filteredFans = useMemo(() => {
    const q = fanSearch.trim().toLowerCase()
    if (!q) return fans
    return fans.filter((f) => {
      const u = (f.username || '').toLowerCase()
      const d = (f.display_name || '').toLowerCase()
      const id = String(f.fan_id).toLowerCase()
      return u.includes(q) || d.includes(q) || id.includes(q)
    })
  }, [fans, fanSearch])

  const derivedRecipientPreview = useMemo(() => {
    if (recipientMode === 'custom') return customRecipientKey.trim()
    if (!selectedFanId) return ''
    return `onlyfans:${selectedFanId}`
  }, [recipientMode, customRecipientKey, selectedFanId])

  async function runEmbed() {
    setBusy(true)
    setMsg(null)
    try {
      const body: Record<string, unknown> = {
        contentId,
        source: 'vault_standalone',
      }
      if (recipientMode === 'fan') {
        if (!selectedFanId) {
          setMsg('Choose a chat fan or switch to custom recipient key.')
          setBusy(false)
          return
        }
        body.platformFanId = selectedFanId
        body.platform = 'onlyfans'
      } else {
        const k = customRecipientKey.trim()
        if (!k) {
          setMsg('Enter a recipient key (e.g. campaign id).')
          setBusy(false)
          return
        }
        body.recipientKey = k
      }

      const res = await fetch('/api/ariadne/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = (await res.json()) as { error?: string; success?: boolean; payloadId?: string }
      if (!res.ok) {
        setMsg(j.error || 'Embed failed')
        return
      }
      setMsg(`Embedded. Payload ${j.payloadId ?? 'ok'}. Vault file updated.`)
      void load()
      void loadExports(exportFilterFanId || undefined)
    } catch {
      setMsg('Network error')
    } finally {
      setBusy(false)
    }
  }

  async function runDetect(file: File | null) {
    if (!file) return
    setDetectBusy(true)
    setDetectResponse(null)
    setDetectError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/ariadne/detect', { method: 'POST', body: fd })
      const j = (await res.json()) as Record<string, unknown>
      if (!res.ok) {
        setDetectError(typeof j.error === 'string' ? j.error : 'Detect failed')
        return
      }
      setDetectResponse(j)
    } catch {
      setDetectError('Network error')
    } finally {
      setDetectBusy(false)
    }
  }

  const canRun =
    Boolean(contentId) &&
    (recipientMode === 'custom' ? customRecipientKey.trim().length > 0 : selectedFanId.length > 0)

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Shield className="h-7 w-7 text-circe" />
          Ariadne Trace
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Per-recipient forensic marker (MVP <code className="text-xs">append-v1</code>) appended to vault video bytes.
          Pick a <strong>chat fan</strong> (from your message threads) or a <strong>custom key</strong> for campaigns /
          lists. Technical reference: <code className="text-xs">docs/ariadne-technical-spec.md</code>. Charges{' '}
          {formatToolCreditCost('ariadne-trace')} per embed; {formatToolCreditCost('ariadne-detect')} per detection.
        </p>
        {urlFanId ? (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-200/90">
            Opened from Messages — fan <code className="rounded bg-muted px-1">{urlFanId}</code> pre-selected (
            {urlPlatform}).
          </p>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Embed on existing vault video</CardTitle>
          <CardDescription>
            Choose a video that already has a file in Creatix storage or a hosted URL. The file is re-uploaded with a
            signed marker; your vault row is updated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading vault…
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Vault item</Label>
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

          <div className="space-y-3">
            <Label className="text-base">Recipient</Label>
            <RadioGroup
              value={recipientMode}
              onValueChange={(v) => setRecipientMode(v as 'fan' | 'custom')}
              className="grid gap-3 sm:grid-cols-2"
            >
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors',
                  recipientMode === 'fan' && 'border-primary/50 bg-primary/5',
                )}
              >
                <RadioGroupItem value="fan" id="mode-fan" className="mt-1" />
                <div>
                  <span className="font-medium leading-none">Chat fan</span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Choose from fans seen in your Creatix message threads (OnlyFans). Stored for leak lists per fan.
                  </p>
                </div>
              </label>
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors',
                  recipientMode === 'custom' && 'border-primary/50 bg-primary/5',
                )}
              >
                <RadioGroupItem value="custom" id="mode-custom" className="mt-1" />
                <div>
                  <span className="font-medium leading-none">Custom key</span>
                  <p className="mt-1 text-xs text-muted-foreground">List name, campaign id, or any label you track.</p>
                </div>
              </label>
            </RadioGroup>

            {recipientMode === 'fan' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {fansLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading chat fans…
                    </>
                  ) : (
                    <span>{fans.length} fans in recents — open Messages to refresh the list</span>
                  )}
                </div>
                <Input
                  placeholder="Search by @username, name, or id…"
                  value={fanSearch}
                  onChange={(e) => setFanSearch(e.target.value)}
                  disabled={fansLoading}
                />
                <Select value={selectedFanId || undefined} onValueChange={setSelectedFanId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a fan" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(280px,40vh)] overflow-y-auto">
                    {filteredFans.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">No matches. Try Messages → open threads.</div>
                    ) : (
                      filteredFans.map((f) => (
                        <SelectItem key={f.fan_id} value={f.fan_id}>
                          @{(f.username || f.display_name || f.fan_id).slice(0, 40)}
                          <span className="text-muted-foreground"> · {f.fan_id}</span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {derivedRecipientPreview ? (
                  <p className="text-xs text-muted-foreground">
                    Forensic key stored: <code className="rounded bg-muted px-1">{derivedRecipientPreview}</code>
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient key</Label>
                <Input
                  id="recipient"
                  placeholder="e.g. fan username, list name, or campaign id"
                  value={customRecipientKey}
                  onChange={(e) => setCustomRecipientKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Used in leak attribution and DMCA context — not shown to fans unless you expose it elsewhere.
                </p>
              </div>
            )}
          </div>

          <Button type="button" disabled={busy || !canRun} onClick={() => void runEmbed()}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Run Ariadne embed
          </Button>
          {msg ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{msg}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Traceable sends (this account)</CardTitle>
          <CardDescription>
            Each row is one embedded export. Filter by fan to see everything sent with that chat identity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs text-muted-foreground">Filter by fan id</Label>
            <Input
              className="max-w-xs"
              placeholder="OnlyFans fan id (optional)"
              value={exportFilterFanId}
              onChange={(e) => setExportFilterFanId(e.target.value)}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void loadExports(exportFilterFanId.trim() || undefined)}
            >
              Apply
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setExportFilterFanId('')
                void loadExports()
              }}
            >
              Clear
            </Button>
          </div>
          {exportsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : exportsList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No Ariadne exports yet.</p>
          ) : (
            <ScrollArea className="max-h-[min(360px,50vh)] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">When</TableHead>
                    <TableHead>Video</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead className="w-[120px]">Fan id</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportsList.map((ex) => (
                    <TableRow key={ex.id}>
                      <TableCell className="align-top text-xs text-muted-foreground">
                        {new Date(ex.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="align-top text-sm">
                        {ex.content?.title || 'Untitled'}{' '}
                        <Link
                          href="/dashboard/content-library"
                          className="text-xs text-primary underline"
                        >
                          (vault)
                        </Link>
                      </TableCell>
                      <TableCell className="align-top font-mono text-xs">{ex.recipient_key}</TableCell>
                      <TableCell className="align-top font-mono text-xs">
                        {ex.platform_fan_id || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detect marker (suspected leak file)</CardTitle>
          <CardDescription>Upload a video file recovered from the web. We scan for append-v1 payloads.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
          {detectError ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {detectError}
            </p>
          ) : null}
          {detectResponse ? <AriadneDetectResult data={detectResponse} /> : null}
        </CardContent>
      </Card>
    </div>
  )
}
