'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Share2, Copy, ExternalLink, Check, Sparkles, MessageSquare, Hash, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const DRAFT_KEY = 'circe-social-promo-draft-v1'

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  )
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

interface SocialPromotionProps {
  connections: { platform: string; platform_username: string; is_connected: boolean }[]
}

type SharePlatformId = 'twitter' | 'instagram' | 'tiktok' | 'youtube'

const socialPlatforms: Array<{
  id: SharePlatformId
  name: string
  icon: React.FC<{ className?: string }>
  color: string
  shareUrl: ((text: string, url: string) => string) | null
  charLimit: number
}> = [
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: XIcon,
    color: '#000000',
    shareUrl: (text: string, url: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    charLimit: 280,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: InstagramIcon,
    color: '#E4405F',
    shareUrl: null,
    charLimit: 2200,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: TikTokIcon,
    color: '#000000',
    shareUrl: null,
    charLimit: 2200,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: YouTubeIcon,
    color: '#FF0000',
    shareUrl: null,
    charLimit: 5000,
  },
]

const promoTemplates = [
  {
    name: 'New Content',
    template:
      "New exclusive content just dropped! Don't miss out on what you've been waiting for… link in bio.",
    hashtags: ['newcontent', 'exclusive', 'linkinbio'],
  },
  {
    name: 'Sale / discount',
    template:
      'Limited-time offer — subscribe while it lasts. The good stuff is waiting behind the paywall.',
    hashtags: ['sale', 'discount', 'limitedtime', 'subscribe'],
  },
  {
    name: 'Behind the scenes',
    template: "Ever wonder what goes on behind the scenes? Come see what you're missing — link in bio.",
    hashtags: ['behindthescenes', 'bts', 'exclusive', 'linkinbio'],
  },
  {
    name: 'Engagement',
    template: 'Quick question: what do you want to see more of? Drop it in the comments.',
    hashtags: ['questionoftheday', 'engagement', 'community'],
  },
  {
    name: 'YouTube visibility',
    template:
      'New video is live — tasteful tease, zero spoilers for the main course. Subscribe so you do not miss the next drop; link in bio for the full experience.',
    hashtags: ['youtube', 'shorts', 'newvideo', 'linkinbio'],
  },
]

type AiTarget = 'twitter' | 'instagram' | 'tiktok' | 'youtube' | 'onlyfans' | 'fansly'

function clipForPreview(text: string, max: number) {
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 1))}…`
}

export function SocialPromotion({ connections }: SocialPromotionProps) {
  const [postText, setPostText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiTarget, setAiTarget] = useState<AiTarget>('twitter')
  const [captionOptions, setCaptionOptions] = useState<string[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        postText?: string
        linkUrl?: string
        hashtags?: string[]
        aiTarget?: AiTarget
      }
      if (typeof parsed.postText === 'string') setPostText(parsed.postText)
      if (typeof parsed.linkUrl === 'string') setLinkUrl(parsed.linkUrl)
      if (Array.isArray(parsed.hashtags)) setHashtags(parsed.hashtags.filter((h) => typeof h === 'string'))
      if (parsed.aiTarget) setAiTarget(parsed.aiTarget)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ postText, linkUrl, hashtags, aiTarget }),
        )
      } catch {
        // ignore
      }
    }, 400)
    return () => window.clearTimeout(t)
  }, [postText, linkUrl, hashtags, aiTarget])

  const connectedPlatformLinks = useMemo(
    () =>
      connections.map((c) => ({
        platform: c.platform,
        username: c.platform_username,
        url:
          c.platform === 'onlyfans'
            ? `https://onlyfans.com/${c.platform_username}`
            : c.platform === 'fansly'
              ? `https://fansly.com/${c.platform_username}`
              : '',
      })),
    [connections],
  )

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const fullPostText =
    postText + (hashtags.length > 0 ? `\n\n${hashtags.map((h) => `#${h}`).join(' ')}` : '')

  const generateWithAI = async () => {
    const trimmed = postText.trim()
    if (!trimmed) {
      setAiError('Add a short brief first (what you are teasing, tone, and CTA). AI uses your text as the brief.')
      return
    }
    setAiError(null)
    setIsGenerating(true)
    setCaptionOptions([])
    try {
      const platformForApi =
        aiTarget === 'youtube'
          ? 'instagram'
          : aiTarget === 'twitter'
            ? 'twitter'
            : aiTarget === 'tiktok'
              ? 'tiktok'
              : aiTarget === 'instagram'
                ? 'instagram'
                : aiTarget

      const contentDescription =
        aiTarget === 'youtube'
          ? `Write social-forward copy suitable for YouTube Shorts descriptions / community posts that tease paid content off-platform (no explicit language).\n\nCreator brief:\n${trimmed}`
          : trimmed

      const res = await fetch('/api/ai/caption-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentDescription,
          platform: platformForApi,
          contentType: 'photo',
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        captions?: Array<{ text?: string }>
        hashtags?: string[]
        brandWarnings?: string[]
      }
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Generation failed')
      }
      const caps = Array.isArray(data.captions)
        ? data.captions.map((c) => (typeof c.text === 'string' ? c.text.trim() : '')).filter(Boolean)
        : []
      if (caps.length) {
        setPostText(caps[0]!)
        setCaptionOptions(caps.slice(1))
      }
      if (Array.isArray(data.hashtags) && data.hashtags.length) {
        setHashtags(data.hashtags.map((h) => String(h).replace(/^#/, '')).filter(Boolean))
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Could not generate copy')
    } finally {
      setIsGenerating(false)
    }
  }

  const applyTemplate = (template: (typeof promoTemplates)[0]) => {
    setPostText(template.template)
    setHashtags(template.hashtags)
    setAiError(null)
  }

  return (
    <div className="min-w-0 space-y-8">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <MessageSquare className="h-5 w-5 text-muted-foreground" aria-hidden />
                Post studio
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Draft teasers that pull traffic toward OnlyFans and Fansly — tasteful, confident, on-brand.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">AI target</Label>
                  <Select value={aiTarget} onValueChange={(v) => setAiTarget(v as AiTarget)}>
                    <SelectTrigger className="rounded-xl" aria-label="AI target platform">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twitter">X (Twitter)</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="onlyfans">OnlyFans</SelectItem>
                      <SelectItem value="fansly">Fansly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    className="w-full rounded-full"
                    onClick={generateWithAI}
                    disabled={isGenerating}
                    type="button"
                  >
                    {isGenerating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" aria-hidden />
                    )}
                    Generate with AI
                  </Button>
                </div>
              </div>
              {aiError ? (
                <p className="text-sm text-destructive" role="alert">
                  {aiError}
                </p>
              ) : null}
              {captionOptions.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Other options</Label>
                  <div className="flex flex-wrap gap-2">
                    {captionOptions.map((c, i) => (
                      <Button
                        key={i}
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-auto max-w-full whitespace-normal rounded-full px-3 py-1.5 text-left text-xs font-normal"
                        onClick={() => setPostText(c)}
                      >
                        {clipForPreview(c, 72)}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="social-post-body" className="text-sm font-medium">
                  Message
                </Label>
                <Textarea
                  id="social-post-body"
                  placeholder="Write your teaser, hook, and CTA…"
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  className="min-h-36 rounded-xl border-border/80 text-[15px] leading-relaxed"
                />
                <p className="text-right text-xs text-muted-foreground">
                  {fullPostText.length} characters (with hashtags)
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Hash className="h-4 w-4 text-muted-foreground" aria-hidden />
                  Hashtags
                </Label>
                <div className="flex flex-wrap gap-2">
                  {hashtags.map((tag, i) => (
                    <Badge
                      key={`${tag}-${i}`}
                      variant="secondary"
                      className="cursor-pointer rounded-full px-2.5 py-0.5 text-xs hover:bg-destructive/15"
                      onClick={() => setHashtags(hashtags.filter((_, idx) => idx !== i))}
                      role="button"
                      aria-label={`Remove hashtag ${tag}`}
                    >
                      #{tag} ×
                    </Badge>
                  ))}
                  <Input
                    placeholder="Add hashtag…"
                    className="h-8 w-36 rounded-full text-sm"
                    aria-label="Add hashtag"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const value = (e.target as HTMLInputElement).value.replace('#', '').trim()
                        if (value && !hashtags.includes(value)) {
                          setHashtags([...hashtags, value])
                          ;(e.target as HTMLInputElement).value = ''
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="social-link-url" className="text-sm font-medium">
                  Link URL (optional)
                </Label>
                <Input
                  id="social-link-url"
                  placeholder="https://…"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0 overflow-hidden rounded-2xl border-border/80 shadow-sm">
            <CardHeader className="min-w-0 pb-3">
              <CardTitle className="text-base font-semibold tracking-tight">Templates</CardTitle>
              <CardDescription className="text-sm">Tap one to load into the editor.</CardDescription>
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                {promoTemplates.map((template) => (
                  <Button
                    key={template.name}
                    type="button"
                    variant="outline"
                    className="flex h-auto min-h-[4.5rem] min-w-0 w-full max-w-full shrink flex-col items-start justify-start gap-1 overflow-hidden rounded-2xl border-border/70 p-4 text-left whitespace-normal [text-wrap:pretty]"
                    onClick={() => applyTemplate(template)}
                  >
                    <span className="w-full min-w-0 font-medium leading-snug">{template.name}</span>
                    <span className="line-clamp-3 w-full min-w-0 break-words text-left text-xs leading-relaxed text-muted-foreground">
                      {template.template}
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <Share2 className="h-4 w-4 text-muted-foreground" aria-hidden />
                Share & copy
              </CardTitle>
              <CardDescription className="text-sm">Per-channel actions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {socialPlatforms.map((platform) => {
                const Icon = platform.icon
                const shareUrl = platform.shareUrl?.(fullPostText, linkUrl)
                return (
                  <div
                    key={platform.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/15 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${platform.color}18` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: platform.color }} />
                      </div>
                      <span className="truncate text-sm font-medium">{platform.name}</span>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        type="button"
                        onClick={() => copyToClipboard(fullPostText, platform.id)}
                        aria-label={`Copy full post for ${platform.name}`}
                      >
                        {copied === platform.id ? (
                          <Check className="h-4 w-4" aria-hidden />
                        ) : (
                          <Copy className="h-4 w-4" aria-hidden />
                        )}
                      </Button>
                      {shareUrl ? (
                        <Button
                          size="sm"
                          className="rounded-full"
                          type="button"
                          onClick={() => window.open(shareUrl, '_blank', 'width=600,height=400')}
                          aria-label={`Open ${platform.name} share window`}
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold tracking-tight">Length check</CardTitle>
              <CardDescription className="text-sm">Rough fit vs typical limits.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {socialPlatforms.map((p) => {
                const over = fullPostText.length > p.charLimit
                return (
                  <div
                    key={`prev-${p.id}`}
                    className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs leading-relaxed"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="font-medium">{p.name}</span>
                      <span className={cn('tabular-nums', over && 'text-destructive')}>
                        {fullPostText.length}/{p.charLimit}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{clipForPreview(fullPostText, 160)}</p>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold tracking-tight">Live preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                {fullPostText || 'Your post will appear here…'}
              </div>
            </CardContent>
          </Card>

          {connectedPlatformLinks.filter((l) => l.url).length > 0 ? (
            <Card className="overflow-hidden rounded-2xl border-primary/15 bg-primary/[0.03] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Quick OnlyFans / Fansly</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {connectedPlatformLinks
                  .filter((l) => l.url)
                  .map((link) => (
                    <Button
                      key={link.platform}
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="rounded-full"
                      onClick={() => copyToClipboard(link.url, `pf-${link.platform}`)}
                      aria-label={`Copy ${link.platform} URL`}
                    >
                      {copied === `pf-${link.platform}` ? (
                        <Check className="mr-1 h-3.5 w-3.5" />
                      ) : (
                        <Copy className="mr-1 h-3.5 w-3.5" />
                      )}
                      {link.platform}
                    </Button>
                  ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
