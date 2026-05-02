'use client'

import { useEffect, useRef, useState } from 'react'
import { Clapperboard, ImageIcon, Loader2, Plus } from 'lucide-react'
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
import { uploadVaultVideoDirect } from '@/lib/vault-upload-video-direct'

export type VaultQuotaStrip = {
  usageBytes: number
  quotaBytes: number
  remainingBytes: number
  usagePercent: number
}

const MIB = 1024 * 1024
const GIB = 1024 * 1024 * 1024

function formatGiB(bytes: number, fractionDigits = 2): string {
  return `${(bytes / GIB).toFixed(fractionDigits)} GB`
}

/** Small usage reads clearer in MB until it merits GB. */
function formatUsageForMeter(bytes: number): string {
  const mb = bytes / MIB
  const gb = bytes / GIB
  if (gb >= 0.1) return `${gb.toFixed(2)} GB`
  return `${mb.toFixed(1)} MB`
}

type VaultMeterTier = 'gold' | 'purple' | 'green' | 'yellow' | 'red'

/** Bands follow requested sequence: gold → purple → green → yellow → red (critical). */
function vaultMeterTier(usagePercent: number): VaultMeterTier {
  if (usagePercent >= 90) return 'red'
  if (usagePercent >= 65) return 'yellow'
  if (usagePercent >= 40) return 'green'
  if (usagePercent >= 20) return 'purple'
  return 'gold'
}

function vaultMeterFillClass(tier: VaultMeterTier): string {
  switch (tier) {
    case 'gold':
      return cn(
        'bg-amber-400/95 dark:bg-amber-400/88',
        'shadow-[0_0_14px_rgba(251,191,36,0.42),0_0_5px_rgba(252,211,77,0.35)]',
        'dark:shadow-[0_0_16px_rgba(251,191,36,0.35),0_0_6px_rgba(252,211,77,0.28)]',
        'motion-reduce:shadow-none',
      )
    case 'purple':
      return 'bg-violet-500/88 dark:bg-violet-400/78'
    case 'green':
      return 'bg-emerald-500/88 dark:bg-emerald-400/78'
    case 'yellow':
      return 'bg-yellow-500/90 dark:bg-yellow-400/78'
    case 'red':
      return cn(
        'bg-red-600/95 dark:bg-red-500/88',
        'shadow-[0_0_12px_rgba(220,38,38,0.38)] dark:shadow-[0_0_14px_rgba(248,113,113,0.32)]',
        'motion-reduce:shadow-none',
      )
    default:
      return 'bg-foreground/16 dark:bg-foreground/22'
  }
}

function VaultStorageMeter({ q }: { q: VaultQuotaStrip }) {
  const pctRaw = q.quotaBytes > 0 ? Math.min(100, (q.usageBytes / Math.max(1, q.quotaBytes)) * 100) : 0
  const pctRounded = Math.round(pctRaw)
  const tier = vaultMeterTier(pctRaw)

  return (
    <div
      className="w-full max-w-[min(100%,15rem)] shrink-0 select-none"
      role="region"
      aria-label="Vault storage"
    >
      <div className="space-y-2.5">
        <header className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/75">
            Vault storage
          </p>
          <div className="flex flex-col gap-0.5">
            <span className="text-[1.3125rem] font-semibold leading-none tracking-[-0.03em] tabular-nums text-foreground">
              {formatGiB(q.remainingBytes)}
            </span>
            <span className="text-[11px] font-normal leading-snug text-muted-foreground tabular-nums">
              available
            </span>
          </div>
        </header>

        <div
          className="h-1 w-full overflow-hidden rounded-full bg-black/[0.055] dark:bg-white/[0.085]"
          role="progressbar"
          aria-valuenow={pctRounded}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${pctRounded}% vault capacity used`}
          aria-label="Capacity used"
          data-vault-meter-tier={tier}
        >
          <div
            className={cn(
              'h-full max-w-full rounded-full transition-[width,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-[width]',
              vaultMeterFillClass(tier),
            )}
            style={{ width: `${pctRaw}%` }}
          />
        </div>

        <p className="text-[11px] leading-snug tabular-nums text-muted-foreground">
          <span className="text-foreground/70">{formatUsageForMeter(q.usageBytes)}</span>
          <span className="text-muted-foreground/90"> of </span>
          <span>{formatGiB(q.quotaBytes)}</span>
          <span className="text-muted-foreground/90"> used</span>
        </p>
      </div>
    </div>
  )
}

type Props = {
  onSuccess?: () => void | Promise<void>
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
  /** Media vault hub surface — full spacing, storage aside on large screens */
  const inlineVault = presentation === 'inline' && !compact
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
        const up = await uploadVaultVideoDirect(id, file)
        if (!up.ok) {
          setErr(up.error || 'Item was created but the video upload failed.')
          await Promise.resolve(onSuccess?.())
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
          await Promise.resolve(onSuccess?.())
          return
        }
      }

      setTitle('')
      setFile(null)
      if (videoRef.current) videoRef.current.value = ''
      if (photoRef.current) photoRef.current.value = ''
      await Promise.resolve(onSuccess?.())
    } catch {
      setErr('Network error')
    } finally {
      setBusy(false)
    }
  }

  const labelVault = inlineVault
    ? 'text-[13px] font-medium leading-none text-foreground/85'
    : isModal
      ? 'text-[13px] font-medium text-foreground/80'
      : compact
        ? 'text-xs'
        : 'text-[13px] font-medium text-foreground/85'

  const fieldVault = inlineVault
    ? cn(
        'h-11 w-full rounded-2xl border border-black/[0.08] bg-background px-4 text-[15px] shadow-none transition-[border-color,box-shadow]',
        'placeholder:text-muted-foreground/45 focus-visible:border-foreground/22 focus-visible:ring-2 focus-visible:ring-foreground/10 focus-visible:outline-none',
        'dark:border-white/[0.1] dark:bg-background/55 disabled:opacity-50',
      )
    : isModal
      ? 'h-10 rounded-xl border-border/55 bg-muted/35 px-3.5 shadow-none transition-colors focus-visible:ring-1 md:text-[15px]'
      : undefined

  const helpVault = inlineVault ? 'text-[12px] leading-[1.45] text-muted-foreground/78' : isModal ? 'text-[12px] leading-snug text-muted-foreground/75' : 'text-[11px] text-muted-foreground'

  const pickSecondaryBtn = inlineVault
    ? 'h-10 gap-2 rounded-2xl border border-black/[0.08] bg-transparent px-4 text-[13px] font-medium text-foreground shadow-none hover:bg-black/[0.04] dark:border-white/[0.11] dark:hover:bg-white/[0.06]'
    : 'h-9 gap-1.5 rounded-full border-border/50'

  const titleTypeGrid = (
    <div
      className={cn(
        'grid min-w-0 flex-1 gap-4',
        compact && !isModal ? 'sm:grid-cols-1' : 'sm:grid-cols-2',
        isModal && 'gap-4',
        inlineVault && 'sm:gap-5',
      )}
    >
      <div className={cn('space-y-2', isModal && !inlineVault && 'space-y-2')}>
        <Label htmlFor="vault-quick-title" className={labelVault}>
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
          className={fieldVault}
        />
      </div>
      <div className={cn('space-y-2', isModal && !inlineVault && 'space-y-2')}>
        <Label className={labelVault}>Type</Label>
        <Select
          value={kind}
          onValueChange={(v) => {
            setErr(null)
            setKind(v as 'video' | 'photo')
          }}
          disabled={busy}
        >
          <SelectTrigger
            className={cn(
              inlineVault && fieldVault,
              inlineVault && 'flex',
              !inlineVault && cn('rounded-xl', isModal && 'h-10 w-full border-border/55 bg-muted/35 shadow-none md:text-[15px]'),
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="photo">Photo</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  const videoInline =
    inlineVault && kind === 'video' ? (
      <div className="space-y-2">
        <Label className={labelVault}>Video</Label>
        <input
          ref={videoRef}
          type="file"
          accept="video/*,.mp4,.mov,.webm"
          className="sr-only"
          tabIndex={-1}
          disabled={busy}
          onChange={(e) => {
            setErr(null)
            setFile(e.target.files?.[0] ?? null)
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            className={pickSecondaryBtn}
            onClick={() => videoRef.current?.click()}
            aria-label="Choose video file"
          >
            <Clapperboard className="h-4 w-4 opacity-80" aria-hidden />
            Choose video
          </Button>
          {file ? (
            <span className="min-w-0 max-w-[min(100%,14rem)] truncate text-[12px] tabular-nums text-muted-foreground">
              {file.name}
            </span>
          ) : (
            <span className="text-[12px] text-muted-foreground/65">No file selected</span>
          )}
        </div>
        <p className={helpVault}>Add now or later from the item. Title or video file required.</p>
      </div>
    ) : null

  const videoLegacy =
    !inlineVault && kind === 'video' ? (
      <div className={cn('space-y-1.5', isModal && 'space-y-2')}>
        <Label htmlFor="vault-quick-video" className={labelVault}>
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
          className={cn('cursor-pointer text-sm', fieldVault, isModal && 'py-2 file:text-[13px]')}
        />
        <p className={helpVault}>Add now or later from the item. Title or video file required.</p>
      </div>
    ) : null

  const photoBlock =
    kind === 'photo' ? (
      <div className={cn('space-y-2', isModal && !inlineVault && 'space-y-2')}>
        <Label className={labelVault}>Photo file</Label>
        <div className="flex flex-wrap items-center gap-3">
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
            className={pickSecondaryBtn}
            onClick={() => photoRef.current?.click()}
          >
            <ImageIcon className="h-4 w-4 opacity-80" aria-hidden />
            Choose photo
          </Button>
          {file ? (
            <span className="min-w-0 max-w-[min(100%,14rem)] truncate text-[12px] tabular-nums text-muted-foreground">
              {file.name}
            </span>
          ) : inlineVault ? (
            <span className="text-[12px] text-muted-foreground/65">No file selected</span>
          ) : null}
        </div>
        <p className={helpVault}>JPEG, PNG, WebP, or GIF · title or photo required.</p>
      </div>
    ) : null

  const errorBlock = err ? (
    <p
      className={cn(
        'text-destructive',
        inlineVault &&
          'rounded-2xl border border-destructive/18 bg-destructive/[0.05] px-4 py-3 text-[13px] leading-snug',
        isModal && !inlineVault && 'rounded-xl border border-destructive/25 bg-destructive/5 px-3.5 py-2.5 text-[13px] leading-snug',
        !inlineVault && !isModal && 'rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs',
      )}
    >
      {err}
    </p>
  ) : null

  const submitBtn = (
    <Button
      type="button"
      disabled={busy || !canAddToVault}
      onClick={() => void submit()}
      className={cn(
        'gap-2 font-medium',
        inlineVault &&
          'h-11 w-full rounded-2xl bg-foreground px-6 text-[15px] text-background shadow-none hover:bg-foreground/[0.92] motion-safe:transition-colors disabled:opacity-[0.38] sm:w-auto sm:min-w-[12.5rem]',
        isModal &&
          !inlineVault &&
          'h-11 w-full rounded-xl bg-foreground font-medium text-background shadow-sm hover:bg-foreground/88 dark:hover:bg-foreground/90',
        !inlineVault && !isModal && 'rounded-full px-6',
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4 opacity-90" aria-hidden />}
      Add to vault
    </Button>
  )

  const meter = vaultQuota && !isModal ? <VaultStorageMeter q={vaultQuota} /> : null

  if (inlineVault) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12 xl:gap-16">
          <div className="min-w-0 flex-1 space-y-6">
            {titleTypeGrid}
            {videoInline}
            {photoBlock}
            {errorBlock}
            {submitBtn}
          </div>
          {meter ? (
            <aside className="w-full shrink-0 border-t border-border/35 pt-6 lg:max-w-[15rem] lg:border-t-0 lg:border-l lg:border-border/30 lg:pl-10 lg:pt-1 xl:pl-14 dark:border-white/[0.06] dark:lg:border-white/[0.07]">
              {meter}
            </aside>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className={cn(isModal ? 'space-y-5' : 'space-y-3', className)}>
      <div
        className={cn(
          'flex flex-col gap-4',
          !isModal && vaultQuota && 'sm:flex-row sm:items-start sm:justify-between sm:gap-6',
        )}
      >
        {titleTypeGrid}
        {meter}
      </div>

      {videoLegacy}
      {photoBlock}
      {errorBlock}
      {submitBtn}
    </div>
  )
}
