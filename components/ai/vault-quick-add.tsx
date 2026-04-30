'use client'

import { useEffect, useRef, useState } from 'react'
import { ImageIcon, Loader2, Plus } from 'lucide-react'
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

export type VaultQuotaStrip = {
  usageBytes: number
  quotaBytes: number
  remainingBytes: number
  usagePercent: number
}

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function VaultStorageMeter({ q }: { q: VaultQuotaStrip }) {
  const pct =
    q.quotaBytes > 0 ? Math.min(100, Math.round((q.usageBytes / Math.max(1, q.quotaBytes)) * 100)) : 0

  return (
    <div className="w-full max-w-[min(100%,14rem)] shrink-0 space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-[11px] tabular-nums text-muted-foreground">
        <span className="font-medium text-foreground/90">Storage</span>
        <span>
          {formatMb(q.usageBytes)} / {formatMb(q.quotaBytes)}
        </span>
      </div>
      <div
        className="h-[3px] w-full overflow-hidden rounded-full bg-muted/80"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Vault storage ${pct} percent used`}
      >
        <div
          className="h-full rounded-full bg-foreground/35 transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] leading-tight text-muted-foreground">{formatMb(q.remainingBytes)} free</p>
    </div>
  )
}

type Props = {
  onSuccess?: () => void
  /** Tighter layout for dialogs */
  compact?: boolean
  /** Calm typography and neutral primary action — for premium modal surfaces */
  presentation?: 'inline' | 'modal'
  className?: string
  /** Vault usage from `/api/content/vault/storage-quota` */
  vaultQuota?: VaultQuotaStrip | null
}

export function VaultQuickAdd({
  onSuccess,
  compact,
  presentation = 'inline',
  className,
  vaultQuota,
}: Props) {
  const isModal = presentation === 'modal'
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<'video' | 'photo'>('video')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setErr(null)
    setFile(null)
    if (videoRef.current) videoRef.current.value = ''
    if (photoRef.current) photoRef.current.value = ''
  }, [kind])

  const trimmedTitle = title.trim()
  /** Block bare placeholders with no title and no media. */
  const canAddToVault = Boolean(file) || trimmedTitle.length > 0

  const submit = async () => {
    const t = trimmedTitle
    if (!t && !file) {
      setErr('Enter a title or choose a file before adding to the vault.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/content/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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

      if (kind === 'photo' && file) {
        const fd = new FormData()
        fd.append('file', file)
        const up = await fetch(`/api/content/vault/${id}/photo`, { method: 'POST', body: fd })
        const uj = (await up.json()) as { error?: string }
        if (!up.ok) {
          setErr(uj.error || 'Item was created but the photo upload failed.')
          onSuccess?.()
          return
        }
      }

      setTitle('')
      setFile(null)
      if (videoRef.current) videoRef.current.value = ''
      if (photoRef.current) photoRef.current.value = ''
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
          'flex flex-col gap-4',
          !isModal && vaultQuota && 'sm:flex-row sm:items-start sm:justify-between sm:gap-6',
        )}
      >
        <div
          className={cn(
            'grid gap-3',
            compact && !isModal ? 'sm:grid-cols-1' : 'sm:grid-cols-2',
            isModal && 'gap-4',
            'min-w-0 flex-1',
          )}
        >
          <div className={cn('space-y-1.5', isModal && 'space-y-2')}>
            <Label htmlFor="vault-quick-title" className={labelCls}>
              Title
            </Label>
            <Input
              id="vault-quick-title"
              value={title}
              onChange={(e) => {
                setErr(null)
                setTitle(e.target.value)
              }}
              placeholder={
                kind === 'video'
                  ? 'e.g. Promo clip — or attach a video file below'
                  : 'e.g. Set photo — or attach an image below'
              }
              disabled={busy}
              className={fieldCls}
            />
          </div>
          <div className={cn('space-y-1.5', isModal && 'space-y-2')}>
            <Label className={labelCls}>Type</Label>
            <Select
              value={kind}
              onValueChange={(v) => {
                setErr(null)
                setKind(v as 'video' | 'photo')
              }}
              disabled={busy}
            >
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
        {!isModal && vaultQuota ? <VaultStorageMeter q={vaultQuota} /> : null}
      </div>

      {kind === 'video' && (
        <div className={cn('space-y-1.5', isModal && 'space-y-2')}>
          <Label htmlFor="vault-quick-video" className={labelCls}>
            Video file
          </Label>
          <Input
            id="vault-quick-video"
            ref={videoRef}
            type="file"
            accept="video/*,.mp4,.mov,.webm"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null
              setErr(null)
              setFile(f)
            }}
            className={cn('cursor-pointer text-sm', fieldCls, isModal && 'py-2 file:text-[13px]')}
          />
          <p className={helpCls}>Add now or later from the item. Title or video file required.</p>
        </div>
      )}

      {kind === 'photo' && (
        <div className={cn('space-y-1.5', isModal && 'space-y-2')}>
          <Label className={labelCls}>Photo file</Label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={photoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
              className="sr-only"
              tabIndex={-1}
              disabled={busy}
              onChange={(e) => {
                setErr(null)
                setFile(e.target.files?.[0] ?? null)
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              className="h-9 gap-1.5 rounded-full border-border/50"
              onClick={() => photoRef.current?.click()}
            >
              <ImageIcon className="h-3.5 w-3.5" aria-hidden />
              Choose photo
            </Button>
            {file ? (
              <span className="min-w-0 max-w-[min(100%,12rem)] truncate text-[11px] text-muted-foreground">
                {file.name}
              </span>
            ) : null}
          </div>
          <p className={helpCls}>JPEG, PNG, WebP, or GIF · title or photo required.</p>
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
        disabled={busy || !canAddToVault}
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
