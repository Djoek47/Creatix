'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Shield, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatToolCreditCost } from '@/lib/billing/credit-economics'

type VaultRow = {
  id: string
  title: string | null
  content_type: string
  file_url: string | null
  vault_storage_path?: string | null
}

export function AriadneTracePanel() {
  const [items, setItems] = useState<VaultRow[]>([])
  const [loading, setLoading] = useState(true)
  const [contentId, setContentId] = useState<string>('')
  const [recipientKey, setRecipientKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [detectBusy, setDetectBusy] = useState(false)
  const [detectResult, setDetectResult] = useState<string | null>(null)

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

  useEffect(() => {
    void load()
  }, [load])

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
        }),
      })
      const j = (await res.json()) as { error?: string; success?: boolean; payloadId?: string }
      if (!res.ok) {
        setMsg(j.error || 'Embed failed')
        return
      }
      setMsg(`Embedded. Payload ${j.payloadId ?? 'ok'}. Vault file updated.`)
      void load()
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
      const j = (await res.json()) as { error?: string; match?: boolean | string; message?: string }
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
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Shield className="h-7 w-7 text-circe" />
          Ariadne Trace
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Per-recipient forensic marker (MVP <code className="text-xs">append-v1</code>) appended to vault video bytes.
          Technical reference: <code className="text-xs">docs/ariadne-technical-spec.md</code>. Charges{' '}
          {formatToolCreditCost('ariadne-trace')} per embed;{' '}
          {formatToolCreditCost('ariadne-detect')} per detection.
        </p>
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
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient key</Label>
            <Input
              id="recipient"
              placeholder="e.g. fan username, list name, or campaign id"
              value={recipientKey}
              onChange={(e) => setRecipientKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Used in leak attribution and DMCA context — not shown to fans unless you expose it elsewhere.
            </p>
          </div>
          <Button type="button" disabled={busy || !contentId || !recipientKey.trim()} onClick={() => void runEmbed()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Run Ariadne embed
          </Button>
          {msg ? <p className="text-sm text-muted-foreground whitespace-pre-wrap">{msg}</p> : null}
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
          {detectResult ? (
            <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs">{detectResult}</pre>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
