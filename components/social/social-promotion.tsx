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
import { Copy, ExternalLink, Check, Sparkles, Hash, Loader2 } from 'lucide-react'
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

/** Preset = main idea for AI; no fixed marketing copy. */
const promoTemplates = [
  {
    name: 'New Content',
    idea: 'New exclusive work just dropped; FOMO; link in bio. No explicit language.',
    hashtags: ['newcontent', 'exclusive', 'linkinbio'],
  },
  {
    name: 'Sale / discount',
    idea: 'Limited-time offer or price hook; subscribe before it ends; paywall / join CTA. Tasteful, no explicit language.',
    hashtags: ['sale', 'discount', 'limitedtime', 'subscribe'],
  },
  {
    name: 'Behind the scenes',
    idea: 'BTS / process tease; curiosity; link in bio. Tasteful, no explicit language.',
    hashtags: ['behindthescenes', 'bts', 'exclusive', 'linkinbio'],
  },
  {
    name: 'Engagement',
    idea: 'A question for the community; want comments, not a sales hard-sell. Tasteful, no explicit language.',
    hashtags: ['questionoftheday', 'engagement', 'community'],
  },
  {
    name: 'YouTube visibility',
    idea: 'Tease a new video / Short; subscribe so they do not miss the next; link in bio. Tasteful, no explicit language.',
    hashtags: ['youtube', 'shorts', 'newvideo', 'linkinbio'],
  },
]

type AiTarget = 'twitter' | 'instagram' | 'tiktok' | 'youtube' | 'onlyfans' | 'fansly'

function clipForPreview(text: string, max: number) {
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 1))}…`
}

/** Quiet fallback when live preview is unavailable — avoids error spam in the UI. */
function templateAngleHint(idea: string) {
  return clipForPreview(idea.replace(/\s+/g, ' ').trim(), 140)
}

function platformParamForApi(target: AiTarget) {
  if (target === 'youtube') return 'instagram'
  if (target === 'twitter') return 'twitter'
  if (target === 'tiktok') return 'tiktok'
  if (target === 'instagram') return 'instagram'
  return target
}

/** Shared caption request for Post studio, template cards, and AI generate. */
async function fetchSocialCaptions(
  contentDescription: string,
  target: AiTarget,
): Promise<{ captions: string[]; hashtags: string[] }> {
  const platform = platformParamForApi(target)
  const bodyText =
    target === 'youtube'
      ? `Write social-forward copy suitable for YouTube Shorts descriptions / community posts that tease paid content off-platform (no explicit language).\n\nCreator brief:\n${contentDescription}`
      : contentDescription

  const res = await fetch('/api/ai/caption-generator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contentDescription: bodyText,
      platform,
      contentType: 'photo',
    }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    error?: string
    captions?: Array<{ text?: string }>
    hashtags?: string[]
  }
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Generation failed')
  }
  const caps = Array.isArray(data.captions)
    ? data.captions.map((c) => (typeof c.text === 'string' ? c.text.trim() : '')).filter(Boolean)
    : []
  const tags = Array.isArray(data.hashtags)
    ? data.hashtags.map((h) => String(h).replace(/^#/, '')).filter(Boolean)
    : []
  return { captions: caps, hashtags: tags }
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
  /** AI-generated one-liners; missing key → show static angle hint. */
  const [templatePreviews, setTemplatePreviews] = useState<Record<string, string>>({})
  const [templatePreviewsLoading, setTemplatePreviewsLoading] = useState(false)

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

  useEffect(() => {
    let cancelled = false
    setTemplatePreviewsLoading(true)
    setTemplatePreviews({})

    ;(async () => {
      const results = await Promise.all(
        promoTemplates.map(async (t) => {
          const brief = `Return a single very short teaser line (max 18 words) for a UI card under the title "${t.name}". Hint at the angle only. ${t.idea}`
          try {
            const { captions } = await fetchSocialCaptions(brief, aiTarget)
            const line = captions[0]?.trim()
            return { name: t.name, line: line ? clipForPreview(line, 140) : null }
          } catch {
            return { name: t.name, line: null }
          }
        }),
      )
      if (cancelled) return
      const next: Record<string, string> = {}
      for (const { name, line } of results) {
        if (line) next[name] = line
      }
      setTemplatePreviews(next)
      setTemplatePreviewsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [aiTarget])

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
      const { captions, hashtags: tags } = await fetchSocialCaptions(trimmed, aiTarget)
      if (captions.length) {
        setPostText(captions[0]!)
        setCaptionOptions(captions.slice(1))
      }
      if (tags.length) setHashtags(tags)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Could not generate copy')
    } finally {
      setIsGenerating(false)
    }
  }

  const applyTemplate = async (template: (typeof promoTemplates)[0]) => {
    setAiError(null)
    setIsGenerating(true)
    setCaptionOptions([])
    try {
      const fullBrief = `Create social teaser copy for: "${template.name}"\n\nContext: ${template.idea}\n\nTasteful, no explicit language. Tease toward OnlyFans/Fansly; link in bio CTA.`
      const { captions, hashtags: tags } = await fetchSocialCaptions(fullBrief, aiTarget)
      if (captions.length) {
        setPostText(captions[0]!)
        setCaptionOptions(captions.slice(1))
      }
      setHashtags(tags.length ? tags : template.hashtags)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Could not generate from preset')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-w-0 space-y-8">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card className="overflow-hidden rounded-2xl border-border/60 bg-card/40 shadow-none">
            <CardHeader className="space-y-1.5 pb-4 pt-6 sm:pt-7">
              <CardTitle className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                Post studio
              </CardTitle>
              <CardDescription className="text-[15px] leading-relaxed text-muted-foreground">
                Draft teasers that point to OnlyFans and Fansly — clear hook, calm tone, on-brand.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 px-5 pb-6 sm:px-6 sm:pb-7">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium text-foreground">AI target</Label>
                  <Select value={aiTarget} onValueChange={(v) => setAiTarget(v as AiTarget)}>
                    <SelectTrigger
                      className="h-10 rounded-xl border-border/80 bg-background/70 shadow-none"
                      aria-label="AI target platform"
                    >
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
                    type="button"
                    className={cn(
                      'h-10 w-full rounded-xl text-[14px] font-medium shadow-none',
                      'bg-foreground text-background hover:bg-foreground/88',
                      'dark:bg-white dark:text-slate-950 dark:hover:bg-white/90',
                      'disabled:opacity-50',
                    )}
                    onClick={generateWithAI}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin opacity-80" aria-hidden />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4 opacity-80" aria-hidden />
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
                <Label htmlFor="social-post-body" className="text-[13px] font-medium text-foreground">
                  Message
                </Label>
                <Textarea
                  id="social-post-body"
                  placeholder="Write your teaser, hook, and CTA…"
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  className="min-h-36 rounded-xl border-border/80 bg-background/70 text-[15px] leading-relaxed shadow-none focus-visible:ring-foreground/15"
                />
                <p className="text-right text-xs text-muted-foreground">
                  {fullPostText.length} characters (with hashtags)
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
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
                    className="h-9 w-40 rounded-full border-border/80 bg-background/70 text-sm shadow-none"
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
                <Label htmlFor="social-link-url" className="text-[13px] font-medium text-foreground">
                  Link URL (optional)
                </Label>
                <Input
                  id="social-link-url"
                  placeholder="https://…"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="h-10 rounded-xl border-border/80 bg-background/70 shadow-none"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0 gap-0 overflow-hidden rounded-2xl border-border/60 bg-card/40 py-0 shadow-none">
            <CardHeader className="min-w-0 space-y-2 px-5 pb-2 pt-6 sm:px-6 sm:pt-7">
              <CardTitle className="font-serif text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                Templates
              </CardTitle>
              <CardDescription className="max-w-prose text-[15px] leading-relaxed text-muted-foreground">
                Five starting angles. Tap a card to generate full copy for your AI target — or read the angle below while
                previews load.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-w-0 px-5 pb-6 pt-2 sm:px-6 sm:pb-7">
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                {promoTemplates.map((template) => {
                  const hint = templateAngleHint(template.idea)
                  const aiLine = templatePreviews[template.name] ?? null
                  return (
                    <Button
                      key={template.name}
                      type="button"
                      variant="ghost"
                      disabled={isGenerating}
                      className={cn(
                        'group flex h-auto min-h-[5.5rem] min-w-0 w-full max-w-full shrink flex-col items-start justify-start gap-2 overflow-hidden rounded-xl border border-border/50 bg-background/40 p-5 text-left whitespace-normal [text-wrap:pretty]',
                        'transition-[border-color,background-color,box-shadow] duration-200',
                        'hover:border-border hover:bg-muted/20 hover:shadow-sm',
                        'focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      )}
                      onClick={() => void applyTemplate(template)}
                    >
                      <span className="w-full min-w-0 text-[15px] font-semibold leading-snug tracking-tight text-foreground">
                        {template.name}
                      </span>
                      <span className="line-clamp-3 w-full min-w-0 text-left text-[13px] leading-relaxed text-muted-foreground">
                        {templatePreviewsLoading ? (
                          <span className="inline-flex items-center gap-2 text-muted-foreground/75">
                            <span
                              className="inline-block h-1 w-1 rounded-full bg-muted-foreground/45 motion-safe:animate-pulse"
                              aria-hidden
                            />
                            <span>Loading preview</span>
                          </span>
                        ) : aiLine ? (
                          <span className="text-foreground/85">{aiLine}</span>
                        ) : (
                          hint
                        )}
                      </span>
                    </Button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="overflow-hidden rounded-2xl border-border/60 bg-card/40 shadow-none">
            <CardHeader className="space-y-1 pb-3 pt-6 sm:pt-7">
              <CardTitle className="text-base font-semibold tracking-tight">Share & copy</CardTitle>
              <CardDescription className="text-[15px] leading-relaxed">
                Copy your draft or open a share window where the platform supports it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-5 pb-6 sm:px-6 sm:pb-7">
              {socialPlatforms.map((platform) => {
                const Icon = platform.icon
                const shareUrl = platform.shareUrl?.(fullPostText, linkUrl)
                return (
                  <div
                    key={platform.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background/80">
                        <Icon className="h-4 w-4 text-foreground/85" aria-hidden />
                      </div>
                      <span className="truncate text-sm font-medium text-foreground">{platform.name}</span>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 w-9 rounded-lg border-border/70 p-0 shadow-none"
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
                          variant="outline"
                          className="h-9 w-9 rounded-lg border-border/70 p-0 shadow-none"
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

          <Card className="overflow-hidden rounded-2xl border-border/60 bg-card/40 shadow-none">
            <CardHeader className="space-y-1 pb-3 pt-6 sm:pt-7">
              <CardTitle className="text-base font-semibold tracking-tight">Length check</CardTitle>
              <CardDescription className="text-[15px] leading-relaxed">
                Rough character fit vs common limits.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-5 pb-6 sm:px-6 sm:pb-7">
              {socialPlatforms.map((p) => {
                const over = fullPostText.length > p.charLimit
                return (
                  <div
                    key={`prev-${p.id}`}
                    className="rounded-xl border border-border/60 bg-background/40 p-3 text-xs leading-relaxed"
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

          <Card className="overflow-hidden rounded-2xl border-border/60 bg-card/40 shadow-none">
            <CardHeader className="pb-3 pt-6 sm:pt-7">
              <CardTitle className="text-base font-semibold tracking-tight">Live preview</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-6 sm:px-6 sm:pb-7">
              <div className="rounded-xl border border-border/60 bg-background/50 p-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                {fullPostText || 'Your post will appear here…'}
              </div>
            </CardContent>
          </Card>

          {connectedPlatformLinks.filter((l) => l.url).length > 0 ? (
            <Card className="overflow-hidden rounded-2xl border border-dashed border-border/70 bg-muted/10 shadow-none">
              <CardHeader className="pb-2 pt-5">
                <CardTitle className="text-sm font-medium text-muted-foreground">OnlyFans & Fansly URLs</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 px-5 pb-5 sm:px-6 sm:pb-6">
                {connectedPlatformLinks
                  .filter((l) => l.url)
                  .map((link) => (
                    <Button
                      key={link.platform}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full border-border/70 shadow-none"
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
