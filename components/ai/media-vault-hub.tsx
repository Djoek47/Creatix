'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import { Clapperboard, Download, Loader2, ImageIcon, Link2, Mic, Save, Shield, Sparkles, Wand2 } from 'lucide-react'
import { VoiceInputButton } from '@/components/voice-input-button'
import { VaultQuickAdd } from '@/components/ai/vault-quick-add'
import { cn } from '@/lib/utils'

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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('read failed'))
    r.readAsDataURL(file)
  })
}

export function MediaVaultHub() {
  const supabase = createClient()
  const [rows, setRows] = useState<VaultContentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [ofPosts, setOfPosts] = useState<OfPost[]>([])
  const [ofLoading, setOfLoading] = useState(false)
  const [ofError, setOfError] = useState<string | null>(null)
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

  const [frameBusy, setFrameBusy] = useState(false)
  const [frameMsg, setFrameMsg] = useState<string | null>(null)
  const [replaceBusy, setReplaceBusy] = useState(false)

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
        data = fb.data
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

  const loadOfPosts = async () => {
    setOfLoading(true)
    setOfError(null)
    try {
      const res = await fetch('/api/onlyfans/vault-posts?limit=50')
      const json = await res.json()
      if (!res.ok) {
        setOfError(json.error || 'Failed to load')
        setOfPosts([])
        return
      }
      setOfPosts(Array.isArray(json.posts) ? json.posts : [])
    } catch {
      setOfError('Network error')
      setOfPosts([])
    } finally {
      setOfLoading(false)
    }
  }

  useEffect(() => {
    void loadOfPosts()
  }, [])

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
        body: JSON.stringify({ imageBase64, instruction }),
      })
      const json = await res.json()
      if (!res.ok) {
        console.warn(json.error || 'AI touch-up failed')
        return
      }
      setTouchPreview(typeof json.imageBase64 === 'string' ? json.imageBase64 : null)
    } catch (e) {
      console.warn(e)
    } finally {
      setTouchAiBusy(false)
    }
  }

  const thumbFor = (r: VaultContentRow) =>
    r.thumbnail_url || r.file_url || r.external_preview_url || null

  const isPhoto = (r: VaultContentRow) =>
    r.content_type === 'photo' || (r.content_type !== 'video' && !r.content_type?.includes('video'))

  const isVideoRow = (r: VaultContentRow) => {
    const t = (r.content_type || '').toLowerCase()
    return t === 'video' || t.includes('video')
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
        frameLaunchUrl?: string | null
        assetProxyUrl?: string
        frameConfigured?: boolean
      }
      if (!res.ok) {
        if (row) openRow(row, { resetFrameMsg: false })
        setFrameMsg(j.error || 'Could not start editor session')
        return
      }
      const open = j.frameLaunchUrl || j.assetProxyUrl
      if (open) window.open(open, '_blank', 'noopener,noreferrer')
      if (!j.frameConfigured) {
        if (row) openRow(row, { resetFrameMsg: false })
        setFrameMsg(
          'NEXT_PUBLIC_FRAME_URL is not set — opened the asset proxy only. Deploy Frame separately, or use Replace video to upload an edited file.',
        )
      }
    } catch {
      if (row) openRow(row, { resetFrameMsg: false })
      setFrameMsg('Network error')
    } finally {
      setFrameBusy(false)
    }
  }

  const uploadVideoReplace = async (file: File) => {
    if (!selected) return
    setReplaceBusy(true)
    setFrameMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/content/vault/${selected.id}/frame-export`, { method: 'POST', body: fd })
      const j = (await res.json()) as { error?: string; content?: { id: string } }
      if (!res.ok) {
        setFrameMsg(typeof j.error === 'string' ? j.error : 'Upload failed')
        return
      }
      await loadVault()
      if (j.content?.id) {
        const { data } = await supabase
          .from('content')
          .select(
            'id, title, description, content_type, status, thumbnail_url, file_url, vault_storage_path, sales_notes, teaser_tags, spoiler_level, source_platform, external_post_id, external_preview_url, scheduled_at, updated_at',
          )
          .eq('id', j.content.id)
          .single()
        if (data) setSelected(data as VaultContentRow)
      }
    } catch {
      setFrameMsg('Upload failed')
    } finally {
      setReplaceBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Media &amp; Vault
          </CardTitle>
          <CardDescription>
            Creatix library plus OnlyFans posts. Add <strong>sales notes</strong> and <strong>teaser tags</strong> so
            Divine Manager can recommend the right PPVs in DMs—same data as vault tools.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="creatix" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="creatix">Creatix vault</TabsTrigger>
          <TabsTrigger value="onlyfans" onClick={() => ofPosts.length === 0 && void loadOfPosts()}>
            OnlyFans feed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="creatix" className="mt-4 space-y-4">
          <Card className="border-dashed border-primary/25">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Add to Creatix vault</CardTitle>
              <CardDescription>
                Create a draft photo or video row here. For videos, you can attach an MP4 now or later (Replace video in
                the item).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VaultQuickAdd onSuccess={() => void loadVault()} />
            </CardContent>
          </Card>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No vault items yet. Link OnlyFans posts or add content from{' '}
                <Link href="/dashboard/content" className="text-primary underline">
                  Content
                </Link>
                .
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => openRow(r)}
                  className={cn(
                    'flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition hover:border-primary/40',
                  )}
                >
                  <div className="relative aspect-video bg-muted">
                    {thumbFor(r) ? (
                      <Image
                        src={thumbFor(r)!}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                    {r.source_platform === 'onlyfans' && (
                      <Badge className="absolute right-2 top-2 text-[10px]" variant="secondary">
                        OF
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="line-clamp-2 text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {r.content_type} · {r.status}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="onlyfans" className="mt-4 space-y-4">
          {ofLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : ofError ? (
            <p className="text-sm text-muted-foreground">{ofError}</p>
          ) : (
            <ScrollArea className="h-[min(60vh,520px)] pr-3">
              <div className="space-y-3">
                {ofPosts.map((p) => {
                  const prev = p.media?.[0]?.url
                  return (
                    <Card key={p.id}>
                      <CardContent className="flex gap-3 p-3">
                        <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md bg-muted">
                          {prev ? (
                            <Image src={prev} alt="" fill className="object-cover" unoptimized />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                              Text
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm">{p.text || '(no caption)'}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </p>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="mt-2 gap-1"
                            disabled={linking === p.id}
                            onClick={() => void linkOfPost(p)}
                          >
                            {linking === p.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Link2 className="h-3 w-3" />
                            )}
                            Add to vault
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Describe for Divine</SheetTitle>
            <SheetDescription>
              Private metadata for DM and PPV recommendations—not shown to fans.
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="mt-4 flex flex-1 flex-col gap-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                {thumbFor(selected) ? (
                  <Image src={thumbFor(selected)!} alt="" fill className="object-cover" unoptimized />
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={draftDescription} onChange={(e) => setDraftDescription(e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Sales notes (for Divine)</Label>
                <Textarea
                  value={draftSales}
                  onChange={(e) => setDraftSales(e.target.value)}
                  placeholder="Hook, buyer, angle, boundaries…"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Teaser tags (comma-separated)</Label>
                <Input value={draftTags} onChange={(e) => setDraftTags(e.target.value)} placeholder="lingerie, gym, cosplay" />
              </div>
              <div className="space-y-2">
                <Label>Spoiler level</Label>
                <Select value={draftSpoiler} onValueChange={setDraftSpoiler}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">none</SelectItem>
                    <SelectItem value="mild">mild</SelectItem>
                    <SelectItem value="explicit">explicit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => void saveRow()} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save metadata
              </Button>

              {selected && isVideoRow(selected) && (
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    <Clapperboard className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">Video (Frame bridge)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Edit cuts in the open-source{' '}
                    <a
                      href="https://github.com/aregrid/frame"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      Frame
                    </a>{' '}
                    app (MIT), or upload an export here. Hosting is short-term — download important files.
                  </p>
                  {frameMsg && (
                    <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-950 dark:text-amber-100">
                      {frameMsg}
                    </p>
                  )}
                  {hasVaultVideoFile(selected) ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Button
                        type="button"
                        variant="secondary"
                        className="gap-2"
                        disabled={frameBusy}
                        onClick={() => void openFrameEditor()}
                      >
                        {frameBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clapperboard className="h-4 w-4" />}
                        Edit in Frame
                      </Button>
                      <Button type="button" variant="outline" className="gap-2" asChild>
                        <a href={`/api/content/vault/${selected.id}/download`} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                      </Button>
                      <Button type="button" variant="outline" className="gap-2" asChild>
                        <Link href="/dashboard/ai-studio/ariadne">
                          <Shield className="h-4 w-4" />
                          Ariadne Trace
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No direct video file on this item yet (preview-only OF posts). Use Replace video to upload an MP4,
                      then you can open Frame.
                    </p>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs">Replace video (export from Frame or any editor)</Label>
                    <Input
                      type="file"
                      accept="video/*,.mp4,.mov,.webm"
                      disabled={replaceBusy}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        e.target.value = ''
                        if (f) void uploadVideoReplace(f)
                      }}
                    />
                    {replaceBusy && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
                      </p>
                    )}
                  </div>
                </div>
              )}

              {isPhoto(selected) && (
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Safe photo touch-up</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Photos only: blur, lighting, or emoji overlay. Upload a file if the preview cannot load (CDN
                    blocking).
                  </p>
                  <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-primary">
                      <Mic className="h-3.5 w-3.5" />
                      AI touch-up (text or voice)
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Describe the change — e.g. &quot;blur more for privacy&quot; or &quot;brighter&quot;. Same safe pipeline as AI Studio; no beautify or inpaint.
                    </p>
                    <div className="flex items-start justify-between gap-2">
                      <Textarea
                        placeholder="What should we change?"
                        value={touchAiInstruction}
                        onChange={(e) => setTouchAiInstruction(e.target.value)}
                        rows={2}
                        className="min-h-[60px] text-sm"
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
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="w-full gap-2"
                      disabled={touchAiBusy || !touchAiInstruction.trim()}
                      onClick={() => void runTouchAi()}
                    >
                      {touchAiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Apply with AI
                    </Button>
                  </div>
                  <Select value={touchOp} onValueChange={(v) => setTouchOp(v as typeof touchOp)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blur">Blur</SelectItem>
                      <SelectItem value="lighting">Lighting</SelectItem>
                      <SelectItem value="emoji">Emoji overlay</SelectItem>
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
                    />
                  )}
                  {touchOp === 'emoji' && (
                    <Input value={touchEmoji} onChange={(e) => setTouchEmoji(e.target.value)} maxLength={8} />
                  )}
                  <Input type="file" accept="image/png,image/jpeg" onChange={(e) => setTouchFile(e.target.files?.[0] || null)} />
                  <Button type="button" variant="secondary" disabled={touchBusy} onClick={() => void runTouchUp()}>
                    {touchBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Run touch-up'}
                  </Button>
                  {touchPreview && (
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={touchPreview} alt="Result" className="h-full w-full object-contain" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
