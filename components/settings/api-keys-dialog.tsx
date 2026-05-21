'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Trash2, Copy, Check } from 'lucide-react'

interface ApiKeyRow {
  id: string
  key_prefix: string
  name: string | null
  created_at: string
}

export function ApiKeysDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [keysLoading, setKeysLoading] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadKeys = useCallback(async () => {
    setKeysLoading(true)
    setError(null)
    const res = await fetch('/api/user/api-keys')
    const data = await res.json().catch(() => ({}))
    if (res.ok && Array.isArray(data.keys)) setKeys(data.keys)
    else setError(typeof data?.error === 'string' ? data.error : 'Could not load API keys.')
    setKeysLoading(false)
  }, [])

  useEffect(() => {
    if (open) {
      void loadKeys()
      setCreateName('')
      setNewKey(null)
      setCopied(false)
    }
  }, [open, loadKeys])

  async function handleCreateKey() {
    setCreateLoading(true)
    setNewKey(null)
    setError(null)
    const res = await fetch('/api/user/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: createName.trim() || null }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.key) {
      setNewKey(data.key)
      setCreateName('')
      loadKeys()
    } else {
      setError(typeof data?.error === 'string' ? data.error : 'Failed to create key.')
    }
    setCreateLoading(false)
  }

  async function handleRevoke(id: string) {
    const res = await fetch(`/api/user/api-keys/${id}`, { method: 'DELETE' })
    if (res.ok) loadKeys()
  }

  function copyKey() {
    if (newKey) {
      void navigator.clipboard.writeText(newKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle className="text-[17px] font-semibold tracking-tight">Developer API keys</DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
            Authenticate integrations and tooling against Circe. These keys are unrelated to calendar or cosmic vault
            passphrases—they only grant programmatic access tied to your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {newKey ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/8 p-4 text-[13px]">
              <p className="mb-3 font-medium text-foreground">Copy this secret once—it will not appear again.</p>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
                <code className="min-w-0 flex-1 truncate font-mono text-[11px]">{newKey}</code>
                <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={() => copyKey()}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ) : null}

          {error ? <p className="text-[13px] text-destructive">{error}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Label (optional)"
              className="max-w-[12rem] bg-background/80 text-[13px]"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
            />
            <Button type="button" variant="secondary" disabled={createLoading} onClick={() => void handleCreateKey()}>
              {createLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Create key
            </Button>
          </div>

          {keysLoading ? (
            <p className="text-[13px] text-muted-foreground">Loading…</p>
          ) : keys.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No keys yet.</p>
          ) : (
            <ul className="space-y-2">
              {keys.map((k) => (
                <li
                  key={k.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-[12px] text-muted-foreground">{k.key_prefix}</p>
                    <p className="truncate text-[13px] text-foreground">{k.name || 'Untitled'}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => void handleRevoke(k.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Revoke key</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="sm:justify-end">
          <Button type="button" variant="outline" className="min-h-10 px-8" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
