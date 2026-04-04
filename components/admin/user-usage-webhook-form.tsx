'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  userId: string
  initial: { url: string; enabled: boolean } | null
}

export function AdminUserUsageWebhookForm({ userId, initial }: Props) {
  const [url, setUrl] = useState(initial?.url ?? '')
  const [secret, setSecret] = useState('')
  const [enabled, setEnabled] = useState(initial?.enabled !== false)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function clearSecretOnly() {
    if (!url.trim()) {
      setStatus('Set and save a URL before clearing the secret.')
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/usage-webhook`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), enabled, clearSecret: true }),
      })
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setStatus(j.error ?? `Error ${res.status}`)
        return
      }
      setStatus('Secret cleared.')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  async function save(clearUrl: boolean) {
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/usage-webhook`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          clearUrl
            ? { url: '' }
            : {
                url,
                enabled,
                ...(secret.trim() ? { secret: secret.trim() } : {}),
              },
        ),
      })
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setStatus(j.error ?? `Error ${res.status}`)
        return
      }
      setStatus('Saved.')
      if (secret.trim()) setSecret('')
      if (clearUrl) {
        setUrl('')
        setEnabled(true)
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="usage-wh-url">Webhook URL (HTTPS)</Label>
        <Input
          id="usage-wh-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/creatix/ai-usage"
          autoComplete="off"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="usage-wh-secret">New HMAC secret (optional)</Label>
        <Input
          id="usage-wh-secret"
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Leave blank to keep existing"
          autoComplete="new-password"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Enabled
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={loading} onClick={() => save(false)}>
          Save
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={loading} onClick={clearSecretOnly}>
          Clear secret
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => save(true)}>
          Remove webhook
        </Button>
      </div>
      {status && <p className="text-xs text-muted-foreground">{status}</p>}
    </div>
  )
}
