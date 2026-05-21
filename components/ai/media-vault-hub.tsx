'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Archive, Clapperboard, Download, Loader2, ImageIcon, Link2, Mic, Save, Shield, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { VoiceInputButton } from '@/components/voice-input-button'
import { VaultQuickAdd } from '@/components/ai/vault-quick-add'
import { uploadVaultVideoDirect } from '@/lib/vault-upload-video-direct'
import { VaultHoverPlayVideo } from '@/components/ai/vault-hover-cinema-video'
import { useCreditInsufficientModal } from '@/components/billing/credit-insufficient-modal-context'
import { InsufficientCreditsCallout } from '@/components/billing/insufficient-credits-callout'
import { cn } from '@/lib/utils'
import { proxifyChatOrVaultMediaUrl } from '@/lib/proxy-image-url'
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC } from '@/lib/platform-logos'
import { formatToolCreditCost, getCreditsForToolId } from '@/lib/billing/credit-economics'
import { useCreditSnapshot } from '@/hooks/use-credit-snapshot'
import { toast } from '@/components/ui/use-toast'
import { useTranslations } from 'next-intl'

/** Billing id matches `POST /api/ai/photo-edit-intent` (`requireAiToolSessionAndCredits`). */
const VAULT_PHOTO_AI_TOOL_ID = 'photo-enhancer' as const

const SETTINGS_INTEGRATIONS_HREF = '/dashboard/settings?tab=integrations'

function VaultPlatformConnectEmpty({ platform }: { platform: 'onlyfans' | 'fansly' }) {
  const tm = useTranslations('ai-tools.mediaVault')
  const isOf = platform === 'onlyfans'
  const label = isOf ? 'OnlyFans' : 'Fansly'

  return (
    <div className="flex min-h-[min(52vh,460px)] flex-col items-center justify-center gap-8 px-4 py-12 text-center sm:px-6">
      <div className="max-w-[28ch] space-y-2">
        <h3 className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-foreground sm:text-lg">
          {isOf ? tm('connectTitleOnlyfans') : tm('connectTitleFansly')}
        </h3>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {isOf ? tm('connectBodyOnlyfans') : tm('connectBodyFansly')}
        </p>
      </div>

      <Link
        href={SETTINGS_INTEGRATIONS_HREF}
        className={cn(
          'group flex w-full max-w-[18rem] flex-col items-center justify-center gap-4 rounded-2xl border border-black/[0.07] bg-background px-10 py-11 shadow-[0_8px_30px_-22px_rgba(0,0,0,0.14)] transition-[border-color,background-color,box-shadow]',
          'hover:border-foreground/16 hover:bg-muted/[0.35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'dark:border-white/[0.1] dark:bg-background/55 dark:shadow-[0_12px_40px_-28px_rgba(0,0,0,0.55)] dark:hover:bg-white/[0.05]',
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- trusted brand asset */}
        <img
          src={isOf ? ONLYFANS_LOGO_SRC : FANSLY_LOGO_SRC}
          alt=""
          aria-hidden
          className={cn(
            'w-auto object-contain opacity-[0.94] transition-opacity duration-200 group-hover:opacity-100',
            isOf ? 'h-[4.25rem] sm:h-[5rem]' : 'h-[3.75rem] sm:h-[4.5rem]',
          )}
        />
        <span className="text-[14px] font-semibold tracking-[-0.015em] text-foreground">
          {tm('signInWith', { label })}
        </span>
        <span className="max-w-[22ch] text-[11px] leading-snug text-muted-foreground">
          {tm('opensIntegrationsHint')}
        </span>
      </Link>
    </div>
  )
}

export type VaultContentRow = {
  id: string
  title: string
  description: string | null
  content_type: string
  status: string
  thumbnail_url: string | null
  file_url: string | null
  sales_notes: string | null
  teaser_tags: string[] | null
  spoiler_level: string | null
  source_platform: string | null
  external_post_id: string | null
  external_preview_url: string | null
  scheduled_at: string | null
  updated_at?: string | null
  /** Supabase Storage path in vault-media (optional; see scripts/074, 075). */
  vault_storage_path?: string | null
}

type OfPost = {
  id: string
  text: string
  createdAt: string
  media: { id: string; type: string; url: string }[]
}

type VaultQuota = {
  usageBytes: number
  quotaBytes: number
  remainingBytes: number
  usagePercent: number
  recommendedPerUserMb: number
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('read failed'))
    r.readAsDataURL(file)
  })
}

function httpVaultUrl(u: string | null | undefined): string | null {
  const t = typeof u === 'string' ? u.trim() : ''
  return t.length > 0 && /^https?:\/\//i.test(t) ? t : null
}

function vaultUrlLooksLikeVideo(url: string): boolean {
  return /\.(mp4|mov|webm|m4v|ogg)(\?|#|$)/i.test(url)
}

function resolveVaultPreviewMedia(
  r: VaultContentRow,
): { kind: 'image'; src: string } | { kind: 'video'; src: string } | { kind: 'none' } {
  const thumb = httpVaultUrl(r.thumbnail_url)
  if (thumb) return { kind: 'image', src: thumb }

  const file = httpVaultUrl(r.file_url)
  const external = httpVaultUrl(r.external_preview_url)
  const ct = (r.content_type || '').toLowerCase()
  const typedVideo = ct === 'video' || ct.includes('video')

  let videoSrc: string | null = null
  if (typedVideo) {
    if (file) videoSrc = file
    else if (external && vaultUrlLooksLikeVideo(external)) videoSrc = external
  } else {
    if (file && vaultUrlLooksLikeVideo(file)) videoSrc = file
    else if (external && vaultUrlLooksLikeVideo(external)) videoSrc = external
  }

  if (videoSrc) return { kind: 'video', src: videoSrc }

  const imageSrc = file || external
  if (imageSrc) return { kind: 'image', src: imageSrc }

  return { kind: 'none' }
}

function VaultPreviewSurface({
  row,
  placeholderIconClass,
  hoverPlayVideo = true,
}: {
  row: VaultContentRow
  placeholderIconClass?: string
  /** When true, video tiles play on hover (respects reduced motion). */
  hoverPlayVideo?: boolean
}) {
  const tm = useTranslations('ai-tools.mediaVault')
  const media = resolveVaultPreviewMedia(row)
  const placeholderCls = placeholderIconClass ?? 'h-10 w-10 text-muted-foreground'
  const titleLabel = row.title.trim() || tm('defaultVideoPreviewTitle')

  if (media.kind === 'video') {
    const poster = httpVaultUrl(row.thumbnail_url)
    if (hoverPlayVideo) {
      return <VaultHoverPlayVideo src={media.src} poster={poster} titleLabel={titleLabel} />
    }
    return (
      <video
        src={media.src}
        poster={poster ?? undefined}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        preload="metadata"
        aria-label={titleLabel}
      />
    )
  }

  if (media.kind === 'image') {
    return <Image src={media.src} alt="" fill className="object-cover" unoptimized />
  }

  return (
    <div className="flex h-full items-center justify-center">
      <ImageIcon className={placeholderCls} aria-hidden />
    </div>
  )
}

export function MediaVaultHub() {
  const tm = useTranslations('ai-tools.mediaVault')
  const tAi = useTranslations('ai-tools')
  const supabase = createClient()
  const [rows, setRows] = useState<VaultContentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [ofPosts, setOfPosts] = useState<OfPost[]>([])
  const [ofLoading, setOfLoading] = useState(false)
  const [ofError, setOfError] = useState<string | null>(null)
  const [ofNeedsConnect, setOfNeedsConnect] = useState(false)
  const [fanslyPosts, setFanslyPosts] = useState<OfPost[]>([])
  const [fanslyLoading, setFanslyLoading] = useState(false)
  const [fanslyError, setFanslyError] = useState<string | null>(null)
  const [fanslyNeedsConnect, setFanslyNeedsConnect] = useState(false)
  const [fanslyConnected, setFanslyConnected] = useState<boolean | null>(null)
  const [selected, setSelected] = useState<VaultContentRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [linking, setLinking] = useState<string | null>(null)

  const [draftTitle, setDraftTitle] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftSales, setDraftSales] = useState('')
  const [draftTags, setDraftTags] = useState('')
  const [draftSpoiler, setDraftSpoiler] = useState('none')

  const [touchOp, setTouchOp] = useState<'blur' | 'lighting' | 'emoji'>('blur')
  const [touchFile, setTouchFile] = useState<File | null>(null)
  const [touchBlur, setTouchBlur] = useState('10')
  const [touchBright, setTouchBright] = useState('1.08')
  const [touchEmoji, setTouchEmoji] = useState('✨')
  const [touchPreview, setTouchPreview] = useState<string | null>(null)
  const [touchBusy, setTouchBusy] = useState(false)
  const [touchAiInstruction, setTouchAiInstruction] = useState('')
  const [touchAiBusy, setTouchAiBusy] = useState(false)

  const { openCreditInsufficientModal } = useCreditInsufficientModal()
  const { wallet: creditWallet, loading: creditWalletLoading, refresh: refreshCreditWallet } =
    useCreditSnapshot()
  const vaultPhotoAiCost = getCreditsForToolId(VAULT_PHOTO_AI_TOOL_ID)
  const vaultPhotoAiCreditsInsufficient =
    creditWallet != null &&
    vaultPhotoAiCost > 0 &&
    creditWallet.totalRemaining < vaultPhotoAiCost

  const [frameBusy, setFrameBusy] = useState(false)
  const [frameMsg, setFrameMsg] = useState<string | null>(null)
  const [replaceBusy, setReplaceBusy] = useState(false)
  const [vaultQuota, setVaultQuota] = useState<VaultQuota | null>(null)
  const [vaultCategory, setVaultCategory] = useState<'all' | 'app' | 'of'>('all')
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null)

  const loadVault = useCallback(async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setRows([])
        return
      }
      let query = supabase
        .from('content')
        .select(
          'id, title, description, content_type, status, thumbnail_url, file_url, vault_storage_path, sales_notes, teaser_tags, spoiler_level, source_platform, external_post_id, external_preview_url, scheduled_at, updated_at',
        )
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      let { data, error } = await query

      if (error && /vault_storage_path|column/i.test(error.message || '')) {
        const fb = await supabase
          .from('content')
          .select(
            'id, title, description, content_type, status, thumbnail_url, file_url, sales_notes, teaser_tags, spoiler_level, source_platform, external_post_id, external_preview_url, scheduled_at, updated_at',
          )
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
        data =
          (fb.data ?? []).map((row) => ({
            ...row,
            vault_storage_path: null as string | null,
          })) ?? null
        error = fb.error
      }

      if (error) {
        const { data: fallback } = await supabase
          .from('content')
          .select(
            'id, title, description, content_type, status, thumbnail_url, file_url, scheduled_at, updated_at',
          )
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
        setRows((fallback || []) as VaultContentRow[])
        return
      }
      setRows((data || []) as VaultContentRow[])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void loadVault()
  }, [loadVault])

  const loadOfPosts = useCallback(async () => {
    setOfLoading(true)
    setOfError(null)
    try {
      const res = await fetch('/api/onlyfans/vault-posts?limit=50')
      const json = (await res.json()) as { posts?: OfPost[]; error?: string; total?: number }
      if (!res.ok) {
        setOfNeedsConnect(false)
        setOfError(json.error || tm('errorFailedToLoad'))
        setOfPosts([])
        return
      }
      if (json.error === 'OnlyFans not connected') {
        setOfNeedsConnect(true)
        setOfError(null)
        setOfPosts([])
        return
      }
      setOfNeedsConnect(false)
      setOfPosts(Array.isArray(json.posts) ? json.posts : [])
    } catch {
      setOfNeedsConnect(false)
      setOfError(tm('errorNetwork'))
      setOfPosts([])
    } finally {
      setOfLoading(false)
    }
  }, [tm])

  const loadFanslyPosts = useCallback(async () => {
    setFanslyLoading(true)
    setFanslyError(null)
    try {
      const res = await fetch('/api/fansly/vault-posts?limit=50')
      const json = (await res.json()) as { posts?: OfPost[]; error?: string; total?: number }
      if (!res.ok) {
        setFanslyNeedsConnect(false)
        setFanslyError(json.error || tm('errorFailedToLoad'))
        setFanslyPosts([])
        return
      }
      if (json.error === 'Fansly not connected') {
        setFanslyNeedsConnect(true)
        setFanslyError(null)
        setFanslyPosts([])
        return
      }
      setFanslyNeedsConnect(false)
      setFanslyPosts(Array.isArray(json.posts) ? json.posts : [])
    } catch {
      setFanslyNeedsConnect(false)
      setFanslyError(tm('errorNetwork'))
      setFanslyPosts([])
    } finally {
      setFanslyLoading(false)
    }
  }, [tm])

  const refreshFanslyConnection = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setFanslyConnected(false)
      return
    }
    const { data } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', 'fansly')
      .eq('is_connected', true)
      .maybeSingle()
    setFanslyConnected(!!data)
  }, [supabase])

  useEffect(() => {
    void loadOfPosts()
  }, [loadOfPosts])

  useEffect(() => {
    void refreshFanslyConnection()
  }, [refreshFanslyConnection])

  useEffect(() => {
    if (fanslyConnected !== true) return
    void loadFanslyPosts()
  }, [fanslyConnected, loadFanslyPosts])

  const loadQuota = useCallback(async (opts?: { bust?: boolean }) => {
    try {
      const qs = opts?.bust ? `?t=${Date.now()}` : ''
      const res = await fetch(`/api/content/vault/storage-quota${qs}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) return
      const json = (await res.json()) as VaultQuota
      if (
        typeof json?.quotaBytes === 'number' &&
        typeof json?.usageBytes === 'number' &&
        typeof json?.remainingBytes === 'number' &&
        typeof json?.usagePercent === 'number'
      ) {
        setVaultQuota(json)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    void loadQuota()
  }, [loadQuota])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        void loadQuota({ bust: true })
        void loadOfPosts()
        void refreshFanslyConnection()
        if (fanslyConnected === true) void loadFanslyPosts()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [loadQuota, loadOfPosts, refreshFanslyConnection, loadFanslyPosts, fanslyConnected])

  const openRow = (r: VaultContentRow, opts?: { resetFrameMsg?: boolean }) => {
    setSelected(r)
    if (opts?.resetFrameMsg !== false) setFrameMsg(null)
    setDraftTitle(r.title)
    setDraftDescription(r.description || '')
    setDraftSales(r.sales_notes || '')
    setDraftTags((r.teaser_tags || []).join(', '))
    setDraftSpoiler(r.spoiler_level || 'none')
    setTouchPreview(null)
    setTouchFile(null)
    setTouchAiInstruction('')
  }

  const deleteVaultRow = async (r: VaultContentRow) => {
    if (
      !window.confirm(
        tm('deleteConfirm', { title: r.title.trim() || tm('deleteUntitled') }),
      )
    ) {
      return
    }
    setDeleteBusyId(r.id)
    try {
      const res = await fetch(`/api/content/vault/${r.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        const msg = j.error || tm('deleteFailedWithStatus', { status: String(res.status) })
        console.warn(msg)
        toast({
          variant: 'destructive',
          title: tm('toastDeleteFailedTitle'),
          description: msg,
        })
        return
      }
      if (selected?.id === r.id) {
        setSelected(null)
      }
      await loadVault()
      void loadQuota({ bust: true })
    } finally {
      setDeleteBusyId(null)
    }
  }

  const saveRow = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const teaser_tags = draftTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      const res = await fetch(`/api/content/vault/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draftTitle,
          description: draftDescription || null,
          sales_notes: draftSales || null,
          teaser_tags,
          spoiler_level: draftSpoiler,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.warn(json.error || res.statusText)
        return
      }
      await loadVault()
      if (json.content) {
        setSelected(json.content as VaultContentRow)
      }
    } finally {
      setSaving(false)
    }
  }

  const linkOfPost = async (post: OfPost) => {
    const firstImg = post.media?.find((m) => m.type?.toLowerCase().includes('photo') || m.url)
    const preview = firstImg?.url || null
    setLinking(post.id)
    try {
      const res = await fetch('/api/content/vault/import-onlyfans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          text: post.text,
          previewUrl: preview,
          mediaType: firstImg?.type || 'photo',
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        console.warn(json.error)
        return
      }
      await loadVault()
      await loadQuota({ bust: true })
    } finally {
      setLinking(null)
    }
  }

  const linkFanslyPost = async (post: OfPost) => {
    const firstImg = post.media?.find((m) => m.type?.toLowerCase().includes('photo') || m.url)
    const raw = firstImg?.url || null
    const preview = raw ? (proxifyChatOrVaultMediaUrl(raw) ?? raw) : null
    setLinking(post.id)
    try {
      const res = await fetch('/api/content/vault/import-fansly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          text: post.text,
          previewUrl: preview,
          mediaType: firstImg?.type || 'photo',
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        console.warn(json.error)
        return
      }
      await loadVault()
      await loadQuota({ bust: true })
    } finally {
      setLinking(null)
    }
  }

  const runTouchUp = async () => {
    setTouchBusy(true)
    setTouchPreview(null)
    try {
      let imageBase64: string
      if (touchFile) {
        imageBase64 = await fileToDataUrl(touchFile)
      } else {
        const url = selected?.file_url || selected?.thumbnail_url || selected?.external_preview_url
        if (!url) return
        const r = await fetch(url)
        const blob = await r.blob()
        imageBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
      }

      if (!/^data:image\//i.test(imageBase64)) {
        return
      }

      let body: Record<string, unknown> = { imageBase64, operation: touchOp }
      if (touchOp === 'blur') body.sigma = Number.parseFloat(touchBlur) || 10
      if (touchOp === 'lighting') body.brightness = Number.parseFloat(touchBright) || 1.08
      if (touchOp === 'emoji') {
        body.emoji = touchEmoji.slice(0, 8)
        body.xPercent = 50
        body.yPercent = 18
        body.sizePercent = 14
      }

      const res = await fetch('/api/ai/media-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        console.warn(json.error || 'Edit failed')
        return
      }
      setTouchPreview(typeof json.imageBase64 === 'string' ? json.imageBase64 : null)
    } catch (e) {
      console.warn(e)
    } finally {
      setTouchBusy(false)
    }
  }

  const getTouchImageDataUrl = async (): Promise<string | null> => {
    if (touchFile) {
      return fileToDataUrl(touchFile)
    }
    const url = selected?.file_url || selected?.thumbnail_url || selected?.external_preview_url
    if (!url) return null
    const r = await fetch(url)
    const blob = await r.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const runTouchAi = async () => {
    const instruction = touchAiInstruction.trim()
    if (!instruction || !selected) return
    setTouchAiBusy(true)
    setTouchPreview(null)
    try {
      const imageBase64 = await getTouchImageDataUrl()
      if (!imageBase64 || !/^data:image\//i.test(imageBase64)) {
        return
      }
      const res = await fetch('/api/ai/photo-edit-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ imageBase64, instruction }),
      })
      const json = (await res.json()) as {
        error?: string
        imageBase64?: string
        code?: string
        used?: number
        limit?: number
      }
      if (!res.ok) {
        if (res.status === 402) {
          openCreditInsufficientModal({
            requiredCredits: vaultPhotoAiCost,
            used: typeof json.used === 'number' ? json.used : undefined,
            limit: typeof json.limit === 'number' ? json.limit : undefined,
            contextLabel: tm('touchUpContextLabel'),
          })
          void refreshCreditWallet()
          return
        }
        console.warn(json.error || 'AI touch-up failed')
        return
      }
      setTouchPreview(typeof json.imageBase64 === 'string' ? json.imageBase64 : null)
      void refreshCreditWallet()
    } catch (e) {
      console.warn(e)
    } finally {
      setTouchAiBusy(false)
    }
  }

  const filteredRows = rows.filter((r) => {
    if (vaultCategory === 'of')
      return r.source_platform === 'onlyfans' || r.source_platform === 'fansly'
    if (vaultCategory === 'app')
      return r.source_platform !== 'onlyfans' && r.source_platform !== 'fansly'
    return true
  })

  const isPhoto = (r: VaultContentRow) =>
    r.content_type === 'photo' || (r.content_type !== 'video' && !r.content_type?.includes('video'))

  const isVideoRow = (r: VaultContentRow) => {
    const ctype = (r.content_type || '').toLowerCase()
    return ctype === 'video' || ctype.includes('video')
  }

  const hasVaultVideoFile = (r: VaultContentRow) => {
    if (r.vault_storage_path && r.vault_storage_path.length > 0) return true
    return Boolean(r.file_url && /^https?:\/\//i.test(r.file_url.trim()))
  }

  const openFrameEditor = async (row?: VaultContentRow) => {
    const target = row ?? selected
    if (!target) return
    setFrameBusy(true)
    setFrameMsg(null)
    try {
      const res = await fetch(`/api/content/vault/${target.id}/frame-session`)
      const j = (await res.json()) as {
        error?: string
        markitLaunchUrl?: string | null
        frameLaunchUrl?: string | null
        assetProxyUrl?: string
        markitConfigured?: boolean
        frameConfigured?: boolean
      }
      if (!res.ok) {
        if (row) openRow(row, { resetFrameMsg: false })
        setFrameMsg(j.error || tm('frameSessionFailed'))
        return
      }
      const open = j.markitLaunchUrl || j.frameLaunchUrl || j.assetProxyUrl
      if (open) window.open(open, '_blank', 'noopener,noreferrer')
      if (!(j.markitConfigured ?? j.frameConfigured)) {
        if (row) openRow(row, { resetFrameMsg: false })
        setFrameMsg(
          'The Creatix editor route is unavailable, so the asset proxy opened instead. Use Replace video to upload an edited file.',
        )
      }
    } catch {
      if (row) openRow(row, { resetFrameMsg: false })
      setFrameMsg(tm('errorNetwork'))
    } finally {
      setFrameBusy(false)
    }
  }

  const uploadVideoReplace = async (file: File) => {
    if (!selected) return
    setReplaceBusy(true)
    setFrameMsg(null)
    try {
      const res = await uploadVaultVideoDirect(selected.id, file)
      if (!res.ok) {
        setFrameMsg(res.error || tm('uploadFailed'))
        return
      }
      await loadVault()
      await loadQuota({ bust: true })
      const { data } = await supabase
        .from('content')
        .select(
          'id, title, description, content_type, status, thumbnail_url, file_url, vault_storage_path, sales_notes, teaser_tags, spoiler_level, source_platform, external_post_id, external_preview_url, scheduled_at, updated_at',
        )
        .eq('id', selected.id)
        .single()
      if (data) setSelected(data as VaultContentRow)
    } catch {
      setFrameMsg(tm('uploadFailed'))
    } finally {
      setReplaceBusy(false)
    }
  }

  return (
    <div className="space-y-10">
      <Tabs defaultValue="creatix" className="w-full">
        <TabsList className="inline-flex h-auto min-h-11 w-full max-w-lg items-stretch rounded-full bg-muted/40 p-1 sm:w-auto">
          <TabsTrigger
            value="creatix"
            className="flex flex-1 flex-col gap-1 rounded-full px-3 py-2 text-center text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm sm:flex-none sm:min-w-[5.5rem] sm:text-sm"
          >
            <Archive className="mx-auto h-4 w-4 shrink-0 opacity-80" strokeWidth={1.75} aria-hidden />
            <span>{tm('tabVault')}</span>
          </TabsTrigger>
          <TabsTrigger
            value="onlyfans"
            className="flex flex-1 flex-col gap-1 rounded-full px-3 py-2 text-center text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm sm:flex-none sm:min-w-[5.5rem] sm:text-sm"
            onClick={() => ofPosts.length === 0 && void loadOfPosts()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- small tab badge from public */}
            <img
              src={ONLYFANS_LOGO_SRC}
              alt=""
              className="mx-auto h-3.5 w-auto max-w-[3.25rem] object-contain opacity-90 dark:opacity-[0.92]"
            />
            <span>{tm('tabOnlyfans')}</span>
          </TabsTrigger>
          <TabsTrigger
            value="fansly"
            className="flex flex-1 flex-col gap-1 rounded-full px-3 py-2 text-center text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm sm:flex-none sm:min-w-[5.5rem] sm:text-sm"
            onClick={() => fanslyConnected === true && fanslyPosts.length === 0 && void loadFanslyPosts()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={FANSLY_LOGO_SRC}
              alt=""
              className="mx-auto h-3.5 w-auto max-w-[2.85rem] object-contain opacity-90 dark:opacity-[0.92]"
            />
            <span>{tm('tabFansly')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="creatix" className="mt-8 space-y-8">
          <div className="inline-flex rounded-full border border-border/60 bg-muted/20 p-1">
            {(
              [
                ['all', tm('filterAll')],
                ['app', tm('filterUploads')],
                ['of', tm('filterLinked')],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setVaultCategory(key)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                  vaultCategory === key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <section className="rounded-[1.25rem] border border-black/[0.06] bg-card/85 p-6 shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_12px_40px_-28px_rgba(0,0,0,0.14)] backdrop-blur-[2px] dark:border-white/[0.09] dark:bg-card/70 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_16px_48px_-32px_rgba(0,0,0,0.45)] sm:p-8">
            <header className="max-w-[52ch] space-y-2 border-b border-border/40 pb-6 dark:border-white/[0.06]">
              <h2 className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-foreground sm:text-lg">
                {tm('newItemTitle')}
              </h2>
              <p className="text-[13px] leading-relaxed text-muted-foreground/88">
                {tm('newItemBody')}
              </p>
            </header>
            <div className="pt-6">
            <VaultQuickAdd
              onSuccess={async () => {
                await loadVault()
                await loadQuota({ bust: true })
              }}
              vaultQuota={vaultQuota}
            />
            </div>
          </section>

          {loading ? (
            <div className="flex justify-center py-20">
              <div
                className="h-7 w-7 rounded-full border-2 border-muted border-t-foreground/30 motion-safe:animate-spin"
                style={{ animationDuration: '0.85s' }}
                role="status"
                aria-label={tm('ariaLoadingVault')}
              />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 py-14 text-center">
              <p className="text-sm text-muted-foreground">
                {tm('emptyVault')}{' '}
                <Link href="/dashboard/content?view=schedule" className="font-medium text-foreground underline-offset-4 hover:underline">
                  {tm('openCalendar')}
                </Link>{' '}
                {tm('emptyVaultSuffix')}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredRows.map((r) => (
                <div
                  key={r.id}
                  className={cn(
                    'group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card transition-colors hover:border-foreground/15',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => openRow(r)}
                    className="flex flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <div className="relative aspect-video overflow-hidden bg-muted">
                      <VaultPreviewSurface row={r} />
                      <span
                        className={cn(
                          'absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                          r.source_platform === 'onlyfans' || r.source_platform === 'fansly'
                            ? 'bg-background/85 text-foreground shadow-sm'
                            : 'bg-background/85 text-muted-foreground shadow-sm',
                        )}
                      >
                        {r.source_platform === 'onlyfans'
                          ? tm('badgeOf')
                          : r.source_platform === 'fansly'
                            ? tm('badgeFansly')
                            : tm('badgeApp')}
                      </span>
                    </div>
                    <div className="space-y-1 p-3.5">
                      <p className="line-clamp-2 text-sm font-medium leading-snug">{r.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {r.content_type} · {r.status}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    disabled={deleteBusyId !== null}
                    className={cn(
                      'absolute left-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/90 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-destructive/45 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
                    )}
                    aria-label={tm('deleteAria', {
                      title: r.title.trim() || tm('deleteFallbackItem'),
                    })}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      void deleteVaultRow(r)
                    }}
                  >
                    {deleteBusyId === r.id ? (
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                    ) : (
                      <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="onlyfans" className="mt-8 space-y-4">
          {ofLoading ? (
            <div className="flex justify-center py-16">
              <div
                className="h-7 w-7 rounded-full border-2 border-muted border-t-foreground/30 motion-safe:animate-spin"
                style={{ animationDuration: '0.85s' }}
                role="status"
                aria-label={tm('ariaLoadingFeed')}
              />
            </div>
          ) : ofError ? (
            <p className="rounded-xl border border-border/80 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">{ofError}</p>
          ) : ofNeedsConnect ? (
            <div className="overflow-hidden rounded-[1.25rem] border border-black/[0.06] bg-card/60 dark:border-white/[0.08] dark:bg-card/45">
              <VaultPlatformConnectEmpty platform="onlyfans" />
            </div>
          ) : (
            <ScrollArea className="h-[min(60vh,520px)] pr-3">
              {ofPosts.length === 0 ? (
                <div className="flex min-h-[min(52vh,480px)] flex-col items-center justify-center gap-3 px-4 py-14 text-center">
                  <p className="max-w-[32ch] text-[13px] leading-relaxed text-muted-foreground">
                    {tm('ofNoPosts')}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-[13px] text-foreground"
                    onClick={() => void loadOfPosts()}
                  >
                    {tm('refresh')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {ofPosts.map((p) => {
                    const prev = p.media?.[0]?.url
                    return (
                      <Card key={p.id} className="rounded-2xl border-border/80 shadow-none">
                        <CardContent className="flex gap-3 p-3.5">
                          <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md bg-muted">
                            {prev ? (
                              <Image src={prev} alt="" fill className="object-cover" unoptimized />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                {tm('postTextOnly')}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm">{p.text || tm('postNoCaption')}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {new Date(p.createdAt).toLocaleDateString()}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 gap-1 rounded-full"
                              disabled={linking === p.id}
                              onClick={() => void linkOfPost(p)}
                            >
                              {linking === p.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Link2 className="h-3 w-3" />
                              )}
                              {tm('addToVault')}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="fansly" className="mt-8 space-y-4">
          {fanslyConnected === null ? (
            <div className="flex justify-center py-16">
              <div
                className="h-7 w-7 rounded-full border-2 border-muted border-t-foreground/30 motion-safe:animate-spin"
                style={{ animationDuration: '0.85s' }}
                role="status"
                aria-label={tm('ariaCheckingFansly')}
              />
            </div>
          ) : !fanslyConnected || fanslyNeedsConnect ? (
            <div className="overflow-hidden rounded-[1.25rem] border border-black/[0.06] bg-card/60 dark:border-white/[0.08] dark:bg-card/45">
              <VaultPlatformConnectEmpty platform="fansly" />
            </div>
          ) : fanslyLoading ? (
            <div className="flex justify-center py-16">
              <div
                className="h-7 w-7 rounded-full border-2 border-muted border-t-foreground/30 motion-safe:animate-spin"
                style={{ animationDuration: '0.85s' }}
                role="status"
                aria-label={tm('ariaLoadingFeed')}
              />
            </div>
          ) : fanslyError ? (
            <p className="rounded-xl border border-border/80 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">{fanslyError}</p>
          ) : (
            <ScrollArea className="h-[min(60vh,520px)] pr-3">
              {fanslyPosts.length === 0 ? (
                <div className="flex min-h-[min(52vh,480px)] flex-col items-center justify-center gap-3 px-4 py-14 text-center">
                  <p className="max-w-[32ch] text-[13px] leading-relaxed text-muted-foreground">
                    {tm('ofNoPosts')}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-[13px] text-foreground"
                    onClick={() => void loadFanslyPosts()}
                  >
                    {tm('refresh')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {fanslyPosts.map((p) => {
                    const rawPrev = p.media?.[0]?.url
                    const prev = rawPrev ? (proxifyChatOrVaultMediaUrl(rawPrev) ?? rawPrev) : null
                    return (
                      <Card key={p.id} className="rounded-2xl border-border/80 shadow-none">
                        <CardContent className="flex gap-3 p-3.5">
                          <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md bg-muted">
                            {prev ? (
                              <Image src={prev} alt="" fill className="object-cover" unoptimized />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                {tm('postTextOnly')}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm">{p.text || tm('postNoCaption')}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {new Date(p.createdAt).toLocaleDateString()}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 gap-1 rounded-full"
                              disabled={linking === p.id}
                              onClick={() => void linkFanslyPost(p)}
                            >
                              {linking === p.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Link2 className="h-3 w-3" />
                              )}
                              {tm('addToVault')}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="flex h-full max-h-[100dvh] w-full flex-col gap-0 overflow-hidden border-l border-border/30 bg-background p-0 sm:max-w-md">
          <SheetHeader className="shrink-0 space-y-1 border-b border-border/25 px-6 pb-4 pt-14 text-left">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{tm('sheetEyebrow')}</p>
            <SheetTitle className="font-sans text-[1.3125rem] font-semibold leading-snug tracking-[-0.02em] text-foreground">
              {tm('sheetTitle')}
            </SheetTitle>
            <SheetDescription className="text-[13px] leading-relaxed text-muted-foreground">
              {tm('sheetDescription')}
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
                <div className="px-6 pt-5">
                  <div className="relative aspect-video w-full min-h-[8rem] overflow-hidden rounded-2xl bg-muted/50 ring-1 ring-border/20">
                    <VaultPreviewSurface row={selected} placeholderIconClass="h-9 w-9 text-muted-foreground/30" />
                  </div>
                  <p className="mt-2.5 text-center text-[11px] tabular-nums text-muted-foreground capitalize">
                    {selected.content_type} · {selected.status}
                  </p>
                </div>

                <div className="space-y-5 px-6 py-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="vault-sheet-title" className="text-[12px] font-medium text-foreground/90">
                      {tm('labelTitle')}
                    </Label>
                    <Input
                      id="vault-sheet-title"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      className="h-11 rounded-xl border-border/45 bg-muted/10 px-3.5 text-[15px] shadow-sm placeholder:text-muted-foreground/55"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="vault-sheet-desc" className="text-[12px] font-medium text-foreground/90">
                      {tm('labelDescription')}
                    </Label>
                    <Textarea
                      id="vault-sheet-desc"
                      value={draftDescription}
                      onChange={(e) => setDraftDescription(e.target.value)}
                      rows={4}
                      className="resize-none rounded-xl border-border/45 bg-muted/10 px-3.5 py-3 text-[15px] shadow-sm placeholder:text-muted-foreground/55"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="vault-sheet-sales" className="text-[12px] font-medium text-foreground/90">
                      {tm('labelSalesNotes')}
                    </Label>
                    <Textarea
                      id="vault-sheet-sales"
                      value={draftSales}
                      onChange={(e) => setDraftSales(e.target.value)}
                      placeholder={tm('placeholderSalesNotes')}
                      rows={3}
                      className="resize-none rounded-xl border-border/45 bg-muted/10 px-3.5 py-3 text-[15px] shadow-sm placeholder:text-muted-foreground/55"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="vault-sheet-tags" className="text-[12px] font-medium text-foreground/90">
                      {tm('labelTags')}
                    </Label>
                    <Input
                      id="vault-sheet-tags"
                      value={draftTags}
                      onChange={(e) => setDraftTags(e.target.value)}
                      placeholder={tm('placeholderTags')}
                      className="h-11 rounded-xl border-border/45 bg-muted/10 px-3.5 text-[15px] shadow-sm placeholder:text-muted-foreground/55"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="vault-sheet-spoiler" className="text-[12px] font-medium text-foreground/90">
                      {tm('labelSpoiler')}
                    </Label>
                    <Select value={draftSpoiler} onValueChange={setDraftSpoiler}>
                      <SelectTrigger
                        id="vault-sheet-spoiler"
                        className="h-11 rounded-xl border-border/45 bg-muted/10 shadow-sm"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{tm('spoilerNone')}</SelectItem>
                        <SelectItem value="mild">{tm('spoilerMild')}</SelectItem>
                        <SelectItem value="explicit">{tm('spoilerExplicit')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isVideoRow(selected) && (
                  <div className="space-y-4 border-t border-border/25 px-6 pb-8 pt-5">
                    <div className="flex items-center gap-2">
                      <Clapperboard className="h-4 w-4 text-muted-foreground" aria-hidden />
                      <p className="text-[13px] font-semibold tracking-tight text-foreground">{tm('videoSectionTitle')}</p>
                    </div>
                    <p className="text-[12px] leading-relaxed text-muted-foreground">{tm('videoHelp')}</p>
                    {frameMsg ? (
                      <p className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2.5 text-[12px] leading-snug text-amber-950 dark:text-amber-100/95">
                        {frameMsg}
                      </p>
                    ) : null}
                    {hasVaultVideoFile(selected) ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="h-10 gap-1.5 rounded-xl"
                          onClick={() => void openFrameEditor(selected)}
                          disabled={frameBusy}
                          aria-label={tm('ariaEditFrameComingSoon')}
                        >
                          {frameBusy ? (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                          ) : (
                            <Clapperboard className="h-4 w-4 shrink-0" aria-hidden />
                          )}
                          <span>Open in Creatix editor</span>
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="h-10 gap-1.5 rounded-xl" asChild>
                          <a href={`/api/content/vault/${selected.id}/download`} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                            {tm('download')}
                          </a>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-10 cursor-not-allowed gap-1.5 rounded-xl opacity-80"
                          disabled
                          aria-label={tm('ariaAriadneComingSoon')}
                          title={tAi('chrome.comingSoon')}
                        >
                          <Shield className="h-4 w-4 shrink-0" aria-hidden />
                          <span>{tm('ariadneTrace')}</span>
                          <Badge
                            variant="secondary"
                            className="border-border/50 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                          >
                            {tAi('chrome.comingSoon')}
                          </Badge>
                        </Button>
                      </div>
                    ) : (
                      <p className="text-[12px] text-muted-foreground">{tm('unlockMp4Hint')}</p>
                    )}
                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-medium text-foreground/90">{tm('replaceFile')}</Label>
                      <Input
                        type="file"
                        accept="video/*,.mp4,.mov,.webm"
                        disabled={replaceBusy}
                        className="h-11 cursor-pointer rounded-xl border-border/45 bg-muted/10 px-3 text-[13px]"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          e.target.value = ''
                          if (f) void uploadVideoReplace(f)
                        }}
                      />
                      {replaceBusy ? (
                        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin shrink-0" aria-hidden /> {tm('uploading')}
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}

                {isPhoto(selected) && (
                  <div className="space-y-4 border-t border-border/25 px-6 pb-10 pt-5">
                    <div className="flex items-center gap-2">
                      <Wand2 className="h-4 w-4 text-muted-foreground" aria-hidden />
                      <p className="text-[13px] font-semibold tracking-tight text-foreground">{tm('photoSectionTitle')}</p>
                    </div>
                    <p className="text-[12px] leading-relaxed text-muted-foreground">{tm('photoHelp')}</p>
                    <div className="space-y-3 rounded-2xl border border-border/40 bg-muted/[0.2] p-4">
                      <div className="flex items-center gap-2">
                        <Mic className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                        <p className="text-[12px] font-medium text-foreground/90">{tm('aiInstruction')}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Textarea
                          placeholder={tm('aiInstructionPlaceholder')}
                          value={touchAiInstruction}
                          onChange={(e) => setTouchAiInstruction(e.target.value)}
                          rows={2}
                          className="min-h-[4.75rem] flex-1 resize-none rounded-xl border-border/45 bg-background/55 text-[13px] shadow-inner"
                        />
                        <VoiceInputButton
                          onTranscript={(text) =>
                            setTouchAiInstruction((prev) => prev + (prev ? ' ' : '') + text)
                          }
                          size="sm"
                          variant="ghost"
                          showTooltip
                        />
                      </div>
                      {vaultPhotoAiCreditsInsufficient ? (
                        <InsufficientCreditsCallout
                          requiredCredits={vaultPhotoAiCost}
                          actionContext={tm('insufficientCreditsAction')}
                          className="py-2"
                        />
                      ) : (
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          {creditWalletLoading ? (
                            tm('checkingCredits')
                          ) : (
                            tm('creditsPerRunLine', {
                              cost: formatToolCreditCost(VAULT_PHOTO_AI_TOOL_ID),
                            })
                          )}
                        </p>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-10 w-full gap-2 rounded-xl"
                        disabled={
                          touchAiBusy ||
                          !touchAiInstruction.trim() ||
                          vaultPhotoAiCreditsInsufficient
                        }
                        onClick={() => void runTouchAi()}
                      >
                        {touchAiBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {tm('applyWithAi', { cost: formatToolCreditCost(VAULT_PHOTO_AI_TOOL_ID) })}
                      </Button>
                    </div>
                    <Select value={touchOp} onValueChange={(v) => setTouchOp(v as typeof touchOp)}>
                      <SelectTrigger className="h-11 rounded-xl border-border/45 bg-muted/10 shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blur">{tm('opBlur')}</SelectItem>
                        <SelectItem value="lighting">{tm('opLighting')}</SelectItem>
                        <SelectItem value="emoji">{tm('opEmoji')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {touchOp === 'blur' && (
                      <Input
                        type="number"
                        min={0.5}
                        max={35}
                        step={0.5}
                        value={touchBlur}
                        onChange={(e) => setTouchBlur(e.target.value)}
                        className="h-10 rounded-xl border-border/45 bg-muted/10"
                      />
                    )}
                    {touchOp === 'lighting' && (
                      <Input
                        type="number"
                        min={0.65}
                        max={1.35}
                        step={0.02}
                        value={touchBright}
                        onChange={(e) => setTouchBright(e.target.value)}
                        className="h-10 rounded-xl border-border/45 bg-muted/10"
                      />
                    )}
                    {touchOp === 'emoji' && (
                      <Input
                        value={touchEmoji}
                        onChange={(e) => setTouchEmoji(e.target.value)}
                        maxLength={8}
                        className="h-10 rounded-xl border-border/45 bg-muted/10"
                      />
                    )}
                    <Input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={(e) => setTouchFile(e.target.files?.[0] || null)}
                      className="h-11 cursor-pointer rounded-xl border-border/45 bg-muted/10 px-3 text-[13px]"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-10 w-full rounded-xl"
                      disabled={touchBusy}
                      onClick={() => void runTouchUp()}
                    >
                      {touchBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {tm('runTouchUp')}
                    </Button>
                    {touchPreview ? (
                      <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-2xl border border-border/30 bg-muted/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={touchPreview} alt={tm('previewAlt')} className="h-full w-full object-contain" />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-border/30 bg-background/90 px-6 py-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
                <Button
                  type="button"
                  onClick={() => void saveRow()}
                  disabled={saving}
                  className="h-11 w-full gap-2 rounded-xl bg-foreground text-[15px] font-medium text-background shadow-sm hover:bg-foreground/90 dark:hover:bg-foreground/92"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
                  {tm('saveChanges')}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
