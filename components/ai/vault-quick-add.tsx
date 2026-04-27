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
  /** Calm typography and neutral primary action — for premium modal surfaces */
  presentation?: 'inline' | 'modal'
  className?: string
}

export function VaultQuickAdd({ onSuccess, compact, presentation = 'inline', className }: Props) {
  const isModal = presentation === 'modal'
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

  const labelCls = isModal
    ? 'text-[13px] font-medium text-foreground/80'
    : compact
      ? 'text-xs'
      : undefined
  const fieldCls = isModal
    ? 'h-10 rounded-xl border-border/55 bg-muted/35 px-3.5 shadow-none transition-colors focus-visible:ring-1 md:text-[15px]'
    : undefined
  const helpCls = isModal ? 'text-[12px] leading-snug text-muted-foreground/75' : 'text-[11px] text-muted-foreground'

  return (
    <div className={cn(isModal ? 'space-y-5' : 'space-y-3', className)}>
      <div
        className={cn(
          'grid gap-3',
          compact && !isModal ? 'sm:grid-cols-1' : 'sm:grid-cols-2',
          isModal && 'gap-4',
        )}
      >
        <div className={cn('space-y-1.5', isModal && 'space-y-2')}>
          <Label htmlFor="vault-quick-title" className={labelCls}>
            Title
          </Label>
          <Input
            id="vault-quick-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === 'video' ? 'e.g. Gym clip — March' : 'e.g. Teaser still'}
            disabled={busy}
            className={fieldCls}
          />
        </div>
        <div className={cn('space-y-1.5', isModal && 'space-y-2')}>
          <Label className={labelCls}>Type</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as 'video' | 'photo')} disabled={busy}>
            <SelectTrigger className={cn('rounded-xl', isModal && 'h-10 w-full border-border/55 bg-muted/35 shadow-none md:text-[15px]')}>
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
        <div className={cn('space-y-1.5', isModal && 'space-y-2')}>
          <Label htmlFor="vault-quick-file" className={labelCls}>
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
            className={cn('cursor-pointer text-sm', fieldCls, isModal && 'py-2 file:text-[13px]')}
          />
          <p className={helpCls}>
            You can upload now or later from the item (Replace video).
          </p>
        </div>
      )}
      {err && (
        <p
          className={cn(
            'text-destructive',
            isModal
              ? 'rounded-xl border border-destructive/25 bg-destructive/5 px-3.5 py-2.5 text-[13px] leading-snug'
              : 'rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs',
          )}
        >
          {err}
        </p>
      )}
      <Button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        className={cn(
          'gap-2',
          isModal
            ? 'h-11 w-full rounded-xl bg-foreground font-medium text-background shadow-sm hover:bg-foreground/88 dark:hover:bg-foreground/90'
            : 'rounded-full px-6',
        )}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add to vault
      </Button>
    </div>
  )
}
