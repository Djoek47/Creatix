'use client'

import { useRef, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type Props = {
  onSuccess?: () => void
  /** Tighter layout for dialogs */
  compact?: boolean
  className?: string
}

export function VaultQuickAdd({ onSuccess, compact, className }: Props) {
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<'video' | 'photo'>('video')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const submit = async () => {
    const t = title.trim() || (kind === 'video' ? 'New vault video' : 'New vault photo')
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/content/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t, content_type: kind }),
      })
      const j = (await res.json()) as { error?: string; item?: { id: string } }
      if (!res.ok) {
        setErr(j.error || 'Could not add item')
        return
      }
      const id = j.item?.id
      if (!id) {
        setErr('No item id returned')
        return
      }

      if (kind === 'video' && file) {
        const fd = new FormData()
        fd.append('file', file)
        const up = await fetch(`/api/content/vault/${id}/frame-export`, { method: 'POST', body: fd })
        const uj = (await up.json()) as { error?: string }
        if (!up.ok) {
          setErr(uj.error || 'Item was created but the video upload failed.')
          onSuccess?.()
          return
        }
      }

      setTitle('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      onSuccess?.()
    } catch {
      setErr('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className={cn('grid gap-3', compact ? 'sm:grid-cols-1' : 'sm:grid-cols-2')}>
        <div className="space-y-1.5">
          <Label htmlFor="vault-quick-title" className={compact ? 'text-xs' : undefined}>
            Title
          </Label>
          <Input
            id="vault-quick-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === 'video' ? 'e.g. Gym clip — March' : 'e.g. Teaser still'}
            disabled={busy}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={compact ? 'text-xs' : undefined}>Type</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as 'video' | 'photo')} disabled={busy}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="photo">Photo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {kind === 'video' && (
        <div className="space-y-1.5">
          <Label htmlFor="vault-quick-file" className={compact ? 'text-xs' : undefined}>
            Video file (optional)
          </Label>
          <Input
            id="vault-quick-file"
            ref={fileRef}
            type="file"
            accept="video/*,.mp4,.mov,.webm"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null
              setFile(f)
            }}
            className="cursor-pointer text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            You can upload now or later from the item (Replace video).
          </p>
        </div>
      )}
      {err && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
          {err}
        </p>
      )}
      <Button type="button" className="gap-2" disabled={busy} onClick={() => void submit()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add to vault
      </Button>
    </div>
  )
}
