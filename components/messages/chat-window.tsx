'use client'

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Send,
  Paperclip,
  DollarSign,
  MoreVertical,
  User,
  Crown,
  Loader2,
  RefreshCw,
  Sparkles,
  Moon,
  Sun,
  Heart,
  CheckCheck,
  Mail,
  Trash2,
  ChevronDown,
  ChevronRight,
  ChevronsDown,
} from 'lucide-react'
import { VoiceInputButton } from '@/components/voice-input-button'
import { useDivinePanel } from '@/components/divine/divine-panel-context'
import { useVoiceSession } from '@/components/divine/voice-session-context'
import { cn } from '@/lib/utils'
import { stripHtml } from '@/lib/html-utils'
import type { NormalizedChatMessage } from '@/lib/ai/message-suggestions'
import { createClient } from '@/lib/supabase/client'
import { isBoundaryNiche, NICHE_LABELS } from '@/lib/niches'
import { proxyImageUrl } from '@/lib/proxy-image-url'
import { getProxiedMediaPresentation, isVideoMedia, type RawOnlyFansMedia } from '@/lib/messages/of-media'
import { FanProfileModal } from '@/components/messages/fan-profile-modal'
import {
  effectiveChatReadMode,
  mergeMessagingReadPrefs,
  shouldAutoMarkOnOpen,
  type MessagingReadPreferences,
} from '@/lib/messaging-read-preferences'

/** Logged in `divine_dm_send_events` — drives creator bubble color + AI-assisted label. */
type DmSendSource = 'user' | 'divine' | 'divine_scheduled' | 'circe' | 'venus' | 'flirt'

function isDmSendSource(s: string): s is DmSendSource {
  return (
    s === 'user' ||
    s === 'divine' ||
    s === 'divine_scheduled' ||
    s === 'circe' ||
    s === 'venus' ||
    s === 'flirt'
  )
}

function resolveDmSendSource(map: Record<string, DmSendSource>, messageId: string): DmSendSource {
  return map[messageId] ?? 'user'
}

/** Shown when embedded CDN media can’t load in Creatix (signed URLs, DRM, etc.). */
function PlatformViewElsewhereHint({
  platform,
  compact,
}: {
  platform: 'onlyfans' | 'fansly'
  compact?: boolean
}) {
  return (
    <div className={cn('space-y-1', compact ? 'text-left' : 'text-center')}>
      <p className="text-sm text-muted-foreground">
        {platform === 'fansly' ? (
          <>
            Couldn&apos;t load this here. Full video and some content may only be available in the{' '}
            <span className="font-medium text-foreground">Fansly</span> app or on fansly.com.
          </>
        ) : (
          <>
            Couldn&apos;t load this here. Full video and some content are only available in the{' '}
            <span className="font-medium text-foreground">OnlyFans</span> app or at{' '}
            <span className="font-medium text-foreground">onlyfans.com</span>.
          </>
        )}
      </p>
    </div>
  )
}

function creatorBubbleStyles(source: DmSendSource): {
  bubble: string
  timestamp: string
  badgeLabel: string
  badgeMuted: string
  bodyMuted: string
} {
  switch (source) {
    case 'flirt':
      return {
        bubble:
          'border border-pink-400/45 bg-gradient-to-br from-pink-700/95 to-fuchsia-900/80 text-pink-50 shadow-[0_0_0_1px_rgba(244,114,182,0.25)]',
        timestamp: 'text-pink-100/80',
        badgeLabel: 'AI-assisted · Flirt',
        badgeMuted: 'text-pink-200/95',
        bodyMuted: 'text-pink-200/80',
      }
    case 'circe':
      return {
        bubble:
          'border border-violet-400/50 bg-violet-950/45 text-violet-50 shadow-[0_0_0_1px_rgba(139,92,246,0.2)]',
        timestamp: 'text-violet-200/70',
        badgeLabel: 'AI-assisted · Circe',
        badgeMuted: 'text-violet-200/90',
        bodyMuted: 'text-violet-200/80',
      }
    case 'venus':
      return {
        bubble:
          'border border-amber-400/45 bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950 shadow-[0_0_0_1px_rgba(245,158,11,0.35)]',
        timestamp: 'text-amber-950/80',
        badgeLabel: 'AI-assisted · Venus',
        badgeMuted: 'text-amber-950/90',
        bodyMuted: 'text-amber-950/85',
      }
    case 'divine':
    case 'divine_scheduled':
      return {
        bubble:
          'border border-violet-400/50 bg-violet-950/35 text-violet-50 shadow-[0_0_0_1px_rgba(139,92,246,0.2)]',
        timestamp: 'text-violet-200/70',
        badgeLabel: 'AI-assisted · Divine',
        badgeMuted: 'text-violet-200/90',
        bodyMuted: 'text-violet-200/80',
      }
    case 'user':
    default:
      return {
        bubble: 'bg-[#00AFF0] text-white shadow-[0_0_0_1px_rgba(0,175,240,0.35)]',
        timestamp: 'text-white/75',
        badgeLabel: '',
        badgeMuted: '',
        bodyMuted: 'text-white/80',
      }
  }
}

interface OnlyFansConversation {
  user: {
    id: string
    username: string
    name: string
    avatar: string
  }
  lastMessage: {
    id: string
    text: string
    createdAt: string
    isRead: boolean
  }
  unreadCount: number
  platform: 'onlyfans' | 'fansly'
  chatId?: string
}

interface OnlyFansMedia {
  id: number | string
  type: 'photo' | 'video'
  canView: boolean
  files?: {
    full?: { url: string | null; width?: number; height?: number }
    thumb?: { url: string | null }
    preview?: { url: string | null }
    squarePreview?: { url: string | null }
  }
  // Legacy format fallback
  url?: string
  preview?: string
}

interface OnlyFansMessage {
  id: string | number
  fromUser: {
    id: string | number
    username?: string
    name?: string
    avatar?: string
  }
  text: string
  createdAt: string
  isRead?: boolean
  isOpened?: boolean
  isSentByMe?: boolean
  media?: OnlyFansMedia[]
  previews?: { url: string }[]
  price?: number | null
  isPaid?: boolean
  isFree?: boolean
  mediaCount?: number
  /** Merged from Supabase DM cache when the message was removed on OnlyFans but kept locally. */
  _creatix?: {
    removedFromPlatformAt?: string | null
    cachedAt?: string | null
  }
}

interface ChatWindowProps {
  conversation: OnlyFansConversation | null
  userId: string
  /** AI Chatter queue/review: outbox row id from `?chatterDraft=` — prefills composer when fan matches. */
  chatterDraftOutboxId?: string
  onMessageSent?: () => void
  /** Open fan profile modal (parent owns modal on Messages page). */
  onOpenFanProfile?: () => void
  /** When no thread is selected (e.g. empty CRM segment), override the default placeholder. */
  nullConversationTitle?: string
  nullConversationDescription?: string
}

function buildMediaSrcChain(pres: ReturnType<typeof getProxiedMediaPresentation>): string[] {
  const o: string[] = []
  const push = (u: string | undefined) => {
    if (u && !o.includes(u)) o.push(u)
  }
  push(pres.displaySrc)
  push(pres.altSrc)
  push(pres.directSrc)
  push(pres.directAltSrc)
  return o
}

function ChatMediaItem({ media, platform }: { media: OnlyFansMedia; platform: 'onlyfans' | 'fansly' }) {
  const pres = useMemo(() => getProxiedMediaPresentation(media as RawOnlyFansMedia), [
    media.id,
    media.type,
    media.canView,
    media.files?.full?.url,
    media.files?.thumb?.url,
    media.files?.preview?.url,
    media.files?.squarePreview?.url,
    media.url,
    media.preview,
  ])
  const imgChain = useMemo(() => buildMediaSrcChain(pres), [pres])
  const videoChain = useMemo(() => buildMediaSrcChain(pres), [pres])
  const posterChain = useMemo(() => {
    const o: string[] = []
    const push = (u: string | undefined) => {
      if (u && !o.includes(u)) o.push(u)
    }
    push(pres.poster)
    push(pres.directPoster)
    return o
  }, [pres])

  const [imgIdx, setImgIdx] = useState(0)
  const [videoIdx, setVideoIdx] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setImgIdx(0)
    setVideoIdx(0)
    setFailed(false)
  }, [imgChain.join('\0'), videoChain.join('\0')])

  const imgSrc = imgChain[imgIdx]
  const videoSrc = videoChain[videoIdx]
  const videoPoster = posterChain[Math.min(videoIdx, Math.max(0, posterChain.length - 1))] ?? undefined
  const openOriginalHref =
    pres.directSrc ||
    pres.directAltSrc ||
    (media as RawOnlyFansMedia).files?.full?.url ||
    (media as RawOnlyFansMedia).url ||
    undefined

  if (!media.canView && media.canView !== undefined) {
    return (
      <div className="relative rounded-lg bg-muted/50 p-4 text-center">
        <p className="text-sm text-muted-foreground">Locked media</p>
      </div>
    )
  }

  if (failed) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 space-y-2">
        <PlatformViewElsewhereHint platform={platform} />
        {openOriginalHref && /^https?:\/\//i.test(openOriginalHref) && (
          <p className="text-center">
            <a href={openOriginalHref} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
              Try opening link
              {platform === 'fansly' ? ' (may still require Fansly)' : ' (may still require OnlyFans)'}
            </a>
          </p>
        )}
      </div>
    )
  }

  const video = isVideoMedia(media as RawOnlyFansMedia)

  if (video) {
    const src = videoSrc
    if (!src) {
      return (
        <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3">
          <PlatformViewElsewhereHint platform={platform} />
        </div>
      )
    }
    return (
      <video
        src={src}
        poster={videoPoster}
        controls
        playsInline
        className="rounded-lg max-w-full"
        referrerPolicy="no-referrer"
        onError={() => {
          if (videoIdx < videoChain.length - 1) {
            setVideoIdx((i) => i + 1)
          } else {
            setFailed(true)
          }
        }}
      />
    )
  }

  if (!imgSrc) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3">
        <PlatformViewElsewhereHint platform={platform} />
      </div>
    )
  }

  return (
    <img
      src={imgSrc}
      alt="Media"
      className="rounded-lg max-w-full h-auto"
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      onError={() => {
        if (imgIdx < imgChain.length - 1) {
          setImgIdx((i) => i + 1)
        } else {
          setFailed(true)
        }
      }}
    />
  )
}

function ChatPreviewImage({
  rawUrl,
  platform,
}: {
  rawUrl: string
  platform: 'onlyfans' | 'fansly'
}) {
  const chain = useMemo(() => {
    const proxied = proxyImageUrl(rawUrl) || rawUrl
    const o: string[] = []
    if (proxied) o.push(proxied)
    if (rawUrl && rawUrl !== proxied) o.push(rawUrl)
    return o
  }, [rawUrl])
  const [idx, setIdx] = useState(0)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    setIdx(0)
    setHidden(false)
  }, [chain.join('\0')])

  const src = chain[idx]
  if (!src) return null

  if (hidden) {
    return (
      <div className="rounded-md border border-dashed border-border/80 bg-muted/30 px-2 py-1.5">
        <PlatformViewElsewhereHint platform={platform} compact />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt="Preview"
      className="rounded-lg max-w-full h-auto"
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      onError={() => {
        if (idx < chain.length - 1) setIdx((i) => i + 1)
        else setHidden(true)
      }}
    />
  )
}

export function ChatWindow({
  conversation,
  userId: _userId,
  chatterDraftOutboxId,
  onMessageSent,
  onOpenFanProfile,
  nullConversationTitle,
  nullConversationDescription,
}: ChatWindowProps) {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<OnlyFansMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState<'scan' | 'circe' | 'venus' | 'flirt' | null>(null)
  const [scanInsights, setScanInsights] = useState<{
    insights: string[]
    riskFlags: string[]
    suggestedAngles: string[]
  } | null>(null)
  const [circeSuggestions, setCirceSuggestions] = useState<string[] | null>(null)
  const [venusSuggestions, setVenusSuggestions] = useState<string[] | null>(null)
  const [flirtSuggestions, setFlirtSuggestions] = useState<string[] | null>(null)
  const [ppvPrice, setPpvPrice] = useState<string>('')
  const [attachedMediaIds, setAttachedMediaIds] = useState<string[]>([])
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const chatFileInputRef = useRef<HTMLInputElement>(null)
  const [activePanel, setActivePanel] = useState<'circe' | 'venus' | 'flirt' | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Pause OnlyFans message polling after 429 until this timestamp (ms). */
  const onlyFansPollBackoffUntilRef = useRef(0)
  const supabase = useMemo(() => createClient(), [])
  const [niches, setNiches] = useState<string[]>([])
  const [boundaries, setBoundaries] = useState<string[]>([])
  const [flirtLevel, setFlirtLevel] = useState<number>(2)
  const [flirtKeywords, setFlirtKeywords] = useState<string>('')
  const [creatorPronouns, setCreatorPronouns] = useState<string | null>(null)
  const [creatorGenderIdentity, setCreatorGenderIdentity] = useState<string | null>(null)
  const pathname = usePathname()
  const divinePanel = useDivinePanel()
  const voiceSession = useVoiceSession()
  const reserveDivineCrownSpace = pathname?.startsWith('/dashboard/messages') === true
  /** OnlyFans message id → send attribution (from divine_dm_send_events + optimistic sends). */
  const [dmSendSourceByMessageId, setDmSendSourceByMessageId] = useState<Record<string, DmSendSource>>({})
  /** Next send after inserting Circe/Venus/Flirt suggestion (Divine panel wins if set). */
  const pendingComposerSuggestionRef = useRef<'user' | 'circe' | 'venus' | 'flirt'>('user')
  const [divineTyping, setDivineTyping] = useState(false)
  const [purgingCacheIds, setPurgingCacheIds] = useState<Set<string>>(() => new Set())
  /** Loaded when opening an OnlyFans thread; drives auto mark-as-read + per-thread override UI. */
  const [messagingReadPrefs, setMessagingReadPrefs] = useState<MessagingReadPreferences | null>(null)

  const divineComposerHighlight = useMemo(() => {
    if (!conversation) return false
    const convId = String(conversation.user.id)
    if (divineTyping) return true
    const rem = divinePanel?.scheduledDmRemainingMs ?? 0
    const fid = divinePanel?.scheduledDmFanId
    if (rem <= 0 || fid == null || String(fid) === '') return false
    return String(fid) === convId
  }, [divineTyping, divinePanel?.scheduledDmRemainingMs, divinePanel?.scheduledDmFanId, conversation?.user.id])

  const divineScheduleSeconds = useMemo(() => {
    if (!conversation || divineTyping || !divinePanel) return null
    const rem = divinePanel.scheduledDmRemainingMs
    const fid = divinePanel.scheduledDmFanId
    if (rem <= 0 || fid == null || String(fid) !== String(conversation.user.id)) return null
    return Math.max(1, Math.ceil(rem / 1000))
  }, [conversation, divineTyping, divinePanel?.scheduledDmRemainingMs, divinePanel?.scheduledDmFanId])
  /** Only used when parent does not supply `onOpenFanProfile` (e.g. DM overlay). */
  const [internalProfileOpen, setInternalProfileOpen] = useState(false)
  const handleSendMessageRef = useRef<() => Promise<void>>(async () => {})
  const pendingChatterOutboxIdRef = useRef<string | null>(null)
  const messageRef = useRef('')
  messageRef.current = message
  const composerTypeAbortRef = useRef<AbortController | null>(null)
  /** Keep scan tools collapsed by default so the thread remains readable. */
  const [aiSectionOpen, setAiSectionOpen] = useState(false)
  const isOnlyFansConversation = conversation?.platform === 'onlyfans'

  const onlyFansChatReadMode = useMemo(() => {
    if (!conversation || conversation.platform !== 'onlyfans' || !messagingReadPrefs) return null
    return effectiveChatReadMode(messagingReadPrefs, 'onlyfans', String(conversation.user.id))
  }, [conversation, messagingReadPrefs])

  useEffect(() => {
    pendingChatterOutboxIdRef.current = null
  }, [chatterDraftOutboxId, conversation?.user.id])

  useEffect(() => {
    pendingComposerSuggestionRef.current = 'user'
  }, [conversation?.user.id])

  useEffect(() => {
    if (!chatterDraftOutboxId || !conversation || conversation.platform !== 'onlyfans') return
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(chatterDraftOutboxId)) {
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/ai-chatter/outbox/${chatterDraftOutboxId}`, {
          credentials: 'include',
        })
        if (!res.ok || cancelled) return
        const j = (await res.json()) as {
          outbox?: { draft_text?: string; platform_fan_id?: string; status?: string }
        }
        const o = j.outbox
        if (!o || o.status !== 'pending') return
        if (String(o.platform_fan_id) !== String(conversation.user.id)) return
        setMessage(o.draft_text ?? '')
        pendingChatterOutboxIdRef.current = chatterDraftOutboxId
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [chatterDraftOutboxId, conversation?.user.id, conversation?.platform])

  useEffect(() => {
    const hasAiContent =
      scanInsights ||
      activePanel ||
      (circeSuggestions && circeSuggestions.length > 0) ||
      (venusSuggestions && venusSuggestions.length > 0) ||
      (flirtSuggestions && flirtSuggestions.length > 0)
    if (hasAiContent) setAiSectionOpen(true)
  }, [scanInsights, activePanel, circeSuggestions, venusSuggestions, flirtSuggestions])

  const prevConvIdForScrollRef = useRef<string | undefined>(undefined)
  const didSnapBottomForConvRef = useRef<string | null>(null)

  /** After send: jump to latest only if the thread overflows (no-op for short threads). */
  const scrollMessagesListToBottomAfterSend = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el || el.scrollHeight <= el.clientHeight + 2) return
    el.scrollTop = el.scrollHeight
  }, [])

  /** Smooth scroll with duration scaled to distance — “cool” for long threads. */
  const smoothScrollThreadToBottom = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const target = el.scrollHeight - el.clientHeight
    const start = el.scrollTop
    const dist = target - start
    if (dist <= 2) return
    const durationMs = Math.min(2200, 420 + Math.sqrt(dist) * 2.4)
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs)
      const eased = 1 - (1 - p) ** 3
      el.scrollTop = start + dist * eased
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [])

  const [showScrollLatestFab, setShowScrollLatestFab] = useState(false)

  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el || loading) {
      setShowScrollLatestFab(false)
      return
    }
    const thresholdPx = 96
    const minMessagesForFab = 8
    const update = () => {
      const overflow = el.scrollHeight > el.clientHeight + 24
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < thresholdPx
      setShowScrollLatestFab(
        messages.length >= minMessagesForFab && overflow && !nearBottom && !loading,
      )
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    ro?.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro?.disconnect()
    }
  }, [messages.length, loading, conversation?.user?.id])

  const normalizeAndSortMessages = (list: OnlyFansMessage[]) => {
    const byId = new Map<string, OnlyFansMessage>()
    for (const m of list) {
      const key = String(m.id)
      const prev = byId.get(key)
      // Prefer newest platform fields but keep _creatix (removed-on-OF) if the API payload omits it.
      const next = { ...m }
      if (!next._creatix && prev?._creatix) {
        next._creatix = prev._creatix
      }
      byId.set(key, next)
    }
    return Array.from(byId.values()).sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      if (ta !== tb) return ta - tb // old -> new
      // Stable tie-breaker
      return String(a.id).localeCompare(String(b.id))
    })
  }

  // Load creator niches/boundaries and identity for the active platform (stable deps to avoid infinite loop)
  const conversationPlatform = conversation?.platform
  const conversationUserId = conversation?.user?.id
  useEffect(() => {
    const loadNiches = async () => {
      if (!conversationPlatform) {
        setNiches([])
        setBoundaries([])
        return
      }
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('platform_connections')
          .select('platform,niches')
          .eq('user_id', user.id)
          .eq('platform', conversationPlatform)
          .eq('is_connected', true)
          .maybeSingle()
        const tags = ((data as any)?.niches || []) as string[]
        setNiches(tags)
        setBoundaries(tags.filter((n) => isBoundaryNiche(n)))

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()
        if (profile) {
          const basePronouns = (profile as any).pronouns_custom || (profile as any).pronouns || null
          setCreatorPronouns(basePronouns)
          setCreatorGenderIdentity(((profile as any).gender_identity as string) || null)
        }
      } catch {
        // ignore niche loading errors
      }
    }
    loadNiches()
  }, [conversationPlatform, conversationUserId, supabase])

  useEffect(() => {
    composerTypeAbortRef.current?.abort()
    composerTypeAbortRef.current = null
    setDivineTyping(false)
  }, [conversation?.user?.id])

  const applyComposerTextAnimated = useCallback(
    async (fullText: string, replace: boolean, opts?: { skipAnimation?: boolean }) => {
      composerTypeAbortRef.current?.abort()
      const ac = new AbortController()
      composerTypeAbortRef.current = ac

      if (opts?.skipAnimation === true) {
        setMessage((prev) => (replace ? fullText : prev + fullText))
        composerTypeAbortRef.current = null
        return
      }

      setDivineTyping(true)
      const prefix = replace ? '' : messageRef.current
      if (replace) setMessage('')

      const total = fullText.length
      const chunk = total > 160 ? 3 : total > 70 ? 2 : 1
      const delayMs = total > 280 ? 10 : total > 120 ? 15 : 22

      try {
        for (let i = 0; i < total; i += chunk) {
          if (ac.signal.aborted) return
          const end = Math.min(i + chunk, total)
          setMessage(prefix + fullText.slice(0, end))
          await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
        }
      } finally {
        if (composerTypeAbortRef.current === ac) {
          setDivineTyping(false)
          composerTypeAbortRef.current = null
        }
      }
    },
    [],
  )

  const buildNormalizedMessages = (): NormalizedChatMessage[] => {
    return messages.slice(-30).map((m) => ({
      from: m.fromUser.id === conversation?.user.id ? 'fan' : 'creator',
      text: stripHtml(m.text || ''),
      createdAt: m.createdAt,
    }))
  }

  // When a conversation becomes active, automatically focus that fan for Divine + voice (primitives-only deps to avoid infinite loop when context updates).
  // Normalize id (API may flip number/string) and trim strings (undefined vs "" must not oscillate deps).
  const focusedFanIdKey =
    conversation?.user?.id != null && conversation.user.id !== ''
      ? String(conversation.user.id)
      : undefined
  const focusedFanUsername = conversation?.user?.username?.trim() || undefined
  const focusedFanName = conversation?.user?.name?.trim() || undefined
  useLayoutEffect(() => {
    if (focusedFanIdKey == null || !divinePanel) return
    const fan = {
      id: focusedFanIdKey,
      username: focusedFanUsername,
      name: focusedFanName,
    }
    const cur = divinePanel.focusedFan
    const curVoice = voiceSession?.focusedFanForVoice
    const fieldsMatch = (
      a: { id: string; username?: string | null; name?: string | null } | null | undefined,
    ) =>
      a != null &&
      String(a.id) === fan.id &&
      (a.username?.trim() || undefined) === fan.username &&
      (a.name?.trim() || undefined) === fan.name
    if (fieldsMatch(cur) && fieldsMatch(curVoice)) return
    if (!fieldsMatch(cur)) divinePanel.setFocusedFan(fan)
    if (!fieldsMatch(curVoice)) voiceSession?.setFocusedFanForVoice(fan)
    // Intentionally omit divinePanel/voiceSession from deps: their refs change when we call setFocusedFan, which would retrigger this effect and cause "Maximum update depth exceeded" (React #185).
  }, [focusedFanIdKey, focusedFanUsername, focusedFanName])

  const dmSuggestionBridge = divinePanel?.dmSuggestionBridge ?? null
  const clearDmSuggestionBridge = divinePanel?.clearDmSuggestionBridge
  useEffect(() => {
    if (!dmSuggestionBridge || !conversation || !clearDmSuggestionBridge) return
    if (String(conversation.user.id) !== String(dmSuggestionBridge.fanId)) return

    setScanInsights(
      dmSuggestionBridge.scan ?? {
        insights: [],
        riskFlags: [],
        suggestedAngles: [],
      },
    )
    setCirceSuggestions(
      dmSuggestionBridge.circeSuggestions.length ? dmSuggestionBridge.circeSuggestions : null,
    )
    setVenusSuggestions(
      dmSuggestionBridge.venusSuggestions.length ? dmSuggestionBridge.venusSuggestions : null,
    )
    setFlirtSuggestions(
      dmSuggestionBridge.flirtSuggestions.length ? dmSuggestionBridge.flirtSuggestions : null,
    )
    setActivePanel(dmSuggestionBridge.highlightPanel)
    clearDmSuggestionBridge()
  }, [conversation?.user?.id, dmSuggestionBridge, clearDmSuggestionBridge])

  const callSuggestionApi = async (mode: 'scan' | 'circe' | 'venus' | 'flirt') => {
    if (!conversation) return
    setError(null)
    setSuggestionsLoading(mode)

    try {
      const body: any = {
        mode,
        platform: conversation.platform,
        fan: {
          id: conversation.user.id,
          username: conversation.user.username,
          name: conversation.user.name,
        },
        messages: buildNormalizedMessages(),
        niches,
        boundaries,
      }

      if (mode === 'flirt') {
        body.flirtControls = {
          explicitnessLevel: flirtLevel,
          inspirationKeywords: flirtKeywords,
        }
      }

      if (creatorPronouns) {
        body.creatorPronouns = creatorPronouns
      }
      if (creatorGenderIdentity) {
        body.creatorGenderIdentity = creatorGenderIdentity
      }

      const res = await fetch('/api/ai/message-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to generate suggestions')
      }

      if (mode === 'scan') {
        setScanInsights(
          data.insights || {
            insights: [],
            riskFlags: [],
            suggestedAngles: [],
          }
        )
        // Persist thread snapshot + profile for fan modal (Scan only hit message-suggestions before).
        void fetch('/api/divine/refresh-thread-insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            fanId: String(conversation.user.id),
            platform: conversation.platform === 'fansly' ? 'fansly' : 'onlyfans',
            force: true,
          }),
        }).catch(() => undefined)
      } else {
        const texts = (data.suggestions || []).map((s: any) => String(s.text || '')).filter(Boolean)
        if (mode === 'circe') {
          setCirceSuggestions(texts.length ? texts : null)
          setActivePanel('circe')
        } else if (mode === 'venus') {
          setVenusSuggestions(texts.length ? texts : null)
          setActivePanel('venus')
        } else if (mode === 'flirt') {
          setFlirtSuggestions(texts.length ? texts : null)
          setActivePanel('flirt')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions')
    } finally {
      setSuggestionsLoading(null)
    }
  }

  const setChatReadBehavior = useCallback(
    async (behavior: 'inherit' | 'auto' | 'never') => {
      if (!conversation || conversation.platform !== 'onlyfans') return
      const res = await fetch('/api/user/messaging-read-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          setChatOverride: {
            platform: 'onlyfans',
            fanId: String(conversation.user.id),
            behavior,
          },
        }),
      })
      if (res.ok) {
        const j = (await res.json()) as Partial<MessagingReadPreferences>
        setMessagingReadPrefs(mergeMessagingReadPrefs(j))
      }
    },
    [conversation],
  )

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversation) {
      setMessages([])
      setMessagingReadPrefs(null)
      return
    }

    setMessages([])
    setDmSendSourceByMessageId({})
    const loadMessages = async () => {
      setLoading(true)
      setError(null)

      try {
        if (conversation.platform !== 'onlyfans') {
          setMessages([])
          setError('Fansly thread view is not available yet on web messages.')
          return
        }
        const res = await fetch(`/api/onlyfans/messages/${conversation.user.id}?limit=100`)
        let data: { error?: string; code?: string; messages?: OnlyFansMessage[] } = {}
        try {
          data = (await res.json()) as typeof data
        } catch {
          data = {}
        }

        if (!res.ok) {
          const rateLimited = res.status === 429 || data.code === 'ONLYFANS_RATE_LIMIT'
          if (rateLimited) {
            onlyFansPollBackoffUntilRef.current = Date.now() + 90_000
          }
          throw new Error(
            data.error ||
              (rateLimited
                ? 'OnlyFans is temporarily limiting requests. Wait a minute, then try again.'
                : 'Failed to load messages'),
          )
        }

        setMessages(normalizeAndSortMessages(data.messages || []))

        const prefsRes = await fetch('/api/user/messaging-read-preferences', { credentials: 'include' })
        const prefs = mergeMessagingReadPrefs(prefsRes.ok ? await prefsRes.json() : null)
        setMessagingReadPrefs(prefs)
        if (shouldAutoMarkOnOpen(prefs, 'onlyfans', String(conversation.user.id))) {
          const cid = String(conversation.chatId || conversation.user.id)
          void fetch(`/api/onlyfans/chats/${encodeURIComponent(cid)}/read`, { method: 'POST' }).catch(
            () => undefined,
          )
          onMessageSent?.()
        }

        void fetch(
          `/api/divine/dm-send-events?fan_id=${encodeURIComponent(String(conversation.user.id))}`,
          { credentials: 'include' },
        )
          .then((r) => r.json())
          .then(
            (j: {
              events?: Array<{ onlyfans_message_id?: string | null; source?: string | null }>
            }) => {
              const next: Record<string, DmSendSource> = {}
              for (const e of j.events ?? []) {
                const mid = e.onlyfans_message_id ? String(e.onlyfans_message_id) : ''
                const src = typeof e.source === 'string' ? e.source.trim() : ''
                if (mid && isDmSendSource(src)) next[mid] = src
              }
              if (Object.keys(next).length) setDmSendSourceByMessageId((prev) => ({ ...prev, ...next }))
            },
          )
          .catch(() => undefined)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages')
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
    // Prefer id + platform over full `conversation` so parents that pass inline objects
    // (or stale memo) cannot retrigger this effect every render (React #185).
  }, [conversation?.user?.id, conversation?.platform, onMessageSent])

  // After paint: snap to bottom when opening a long thread; otherwise only follow if near bottom. Skip when the list fits (no overflow).
  useLayoutEffect(() => {
    if (!conversation || loading) return
    const el = messagesContainerRef.current
    if (!el) return
    const convId = String(conversation.user.id)

    if (prevConvIdForScrollRef.current !== convId) {
      prevConvIdForScrollRef.current = convId
      didSnapBottomForConvRef.current = null
    }

    if (el.scrollHeight <= el.clientHeight + 2) return

    const thresholdPx = 120
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < thresholdPx
    const needInitialSnap = didSnapBottomForConvRef.current !== convId

    if (needInitialSnap) {
      el.scrollTop = el.scrollHeight
      didSnapBottomForConvRef.current = convId
    } else if (nearBottom) {
      el.scrollTop = el.scrollHeight
    }
  }, [conversation, loading, messages])

  // Poll for new messages (OnlyFans route only). Delay first poll + slower interval to reduce rate-limit bursts with voice navigation + thread refresh.
  useEffect(() => {
    if (!conversation || conversation.platform !== 'onlyfans') return
    if (loading) return

    const poll = async () => {
      if (!conversation) return
      if (Date.now() < onlyFansPollBackoffUntilRef.current) return
      setIsPolling(true)
      try {
        const res = await fetch(`/api/onlyfans/messages/${conversation.user.id}?limit=100`)
        let data: { messages?: OnlyFansMessage[]; code?: string } = {}
        try {
          data = (await res.json()) as typeof data
        } catch {
          return
        }
        if (res.status === 429 || data.code === 'ONLYFANS_RATE_LIMIT') {
          onlyFansPollBackoffUntilRef.current = Date.now() + 90_000
          return
        }
        if (res.ok && data?.messages) {
          setMessages((prev) => normalizeAndSortMessages([...prev, ...(data.messages || [])]))
        }
      } catch {
        // silent
      } finally {
        setIsPolling(false)
      }
    }

    if (pollStartTimeoutRef.current) clearTimeout(pollStartTimeoutRef.current)
    pollStartTimeoutRef.current = setTimeout(() => {
      void poll()
      pollIntervalRef.current = setInterval(poll, 12_000)
    }, 8_000)

    return () => {
      if (pollStartTimeoutRef.current) {
        clearTimeout(pollStartTimeoutRef.current)
        pollStartTimeoutRef.current = null
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [conversation?.user?.id, conversation?.platform, loading])

  useEffect(() => {
    if (!divinePanel || !conversation) return
    const fanId = String(conversation.user.id)
    const platform = conversation.platform
    return divinePanel.registerComposerBridge({
      fanId,
      platform,
      setComposerText: (text, replace) => {
        setMessage((prev) => (replace === false ? prev + text : text))
      },
      applyComposerTextAnimated,
      getComposerText: () => messageRef.current,
      setComposerPrice: (p) => setPpvPrice(p),
      setComposerMediaIds: (ids) => setAttachedMediaIds(ids),
      sendFromComposer: async () => {
        await handleSendMessageRef.current()
      },
    })
  }, [divinePanel, conversation?.user?.id, conversation?.platform, applyComposerTextAnimated])

  const handleChatFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length || conversation?.platform !== 'onlyfans') return
    setUploadingMedia(true)
    try {
      const { uploadLocalFileToOnlyFansMedia } = await import('@/lib/onlyfans-upload-client')
      for (let i = 0; i < files.length; i++) {
        const data = await uploadLocalFileToOnlyFansMedia(files[i])
        if (data.id) setAttachedMediaIds((prev) => [...prev, data.id])
      }
    } catch {
      setError('Failed to upload media')
    } finally {
      setUploadingMedia(false)
      e.target.value = ''
    }
  }, [conversation?.platform])

  const handleSendMessage = useCallback(async () => {
    if ((!message.trim() && attachedMediaIds.length === 0) || !conversation || sending) return
    if (conversation.platform !== 'onlyfans') {
      setError('Sending Fansly messages from this page is not available yet.')
      return
    }

    composerTypeAbortRef.current?.abort()
    composerTypeAbortRef.current = null
    setDivineTyping(false)

    setSending(true)
    const messageText = message
    setMessage('')
    const mediaIdsToSend = [...attachedMediaIds]
    const priceToSend = ppvPrice.trim() ? parseFloat(ppvPrice) : undefined
    setAttachedMediaIds([])
    setPpvPrice('')

    try {
      const body: { text: string; mediaIds?: string[]; price?: number } = { text: messageText }
      if (mediaIdsToSend.length > 0) body.mediaIds = mediaIdsToSend
      if (priceToSend != null && !Number.isNaN(priceToSend) && priceToSend >= 0) body.price = priceToSend

      const res = await fetch(`/api/onlyfans/messages/${conversation.user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

        const data = (await res.json()) as {
        error?: string
        message?: OnlyFansMessage & { id?: string | number }
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      if (data.message) {
        const mid = data.message.id != null ? String(data.message.id) : ''
        setMessages((prev) => normalizeAndSortMessages([...prev, data.message as OnlyFansMessage]))
        requestAnimationFrame(() => scrollMessagesListToBottomAfterSend())
        const consumedDivine = divinePanel?.consumePendingDmSendSource() ?? 'user'
        let source: DmSendSource = 'user'
        if (consumedDivine !== 'user') {
          source = consumedDivine
        } else if (pendingComposerSuggestionRef.current !== 'user') {
          source = pendingComposerSuggestionRef.current
          pendingComposerSuggestionRef.current = 'user'
        }
        if (source !== 'user') {
          if (mid) setDmSendSourceByMessageId((prev) => ({ ...prev, [mid]: source }))
          void fetch('/api/divine/dm-send-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              fan_id: String(conversation.user.id),
              platform: conversation.platform === 'fansly' ? 'fansly' : 'onlyfans',
              body_preview: messageText.slice(0, 2000),
              source,
              ...(mid ? { onlyfans_message_id: mid } : {}),
            }),
          }).catch(() => undefined)
        }
      }
      void fetch('/api/divine/refresh-thread-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fanId: String(conversation.user.id),
          platform: conversation.platform === 'fansly' ? 'fansly' : 'onlyfans',
          force: true,
        }),
      }).catch(() => undefined)

      const chatterOutboxId = pendingChatterOutboxIdRef.current
      if (chatterOutboxId) {
        pendingChatterOutboxIdRef.current = null
        void fetch(`/api/ai-chatter/outbox/${chatterOutboxId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'applied' }),
        }).catch(() => undefined)
      }

      onMessageSent?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      setMessage(messageText)
      setAttachedMediaIds(mediaIdsToSend)
      if (priceToSend != null) setPpvPrice(String(priceToSend))
    } finally {
      setSending(false)
    }
  }, [
    message,
    attachedMediaIds,
    ppvPrice,
    conversation,
    sending,
    divinePanel,
    onMessageSent,
    scrollMessagesListToBottomAfterSend,
  ])

  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage
  }, [handleSendMessage])

  if (!conversation) {
    const title = nullConversationTitle ?? 'Select a conversation'
    const description = nullConversationDescription
    return (
      <Card className="flex min-h-0 flex-1 items-center justify-center border-border bg-card">
        <div className="flex max-w-md flex-col items-center px-4 text-center text-muted-foreground">
          <svg className="mb-4 h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description ? (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          ) : (
            <p className="mt-1 text-sm">to start messaging</p>
          )}
        </div>
      </Card>
    )
  }

  const fan = conversation.user

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden border-border bg-card py-0 shadow-sm">
      {/* Label + thread actions (menu only — no separate “Thread tools” bar) */}
      <div className="z-10 shrink-0 border-b border-border/60 bg-card px-3 py-2 sm:px-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium uppercase leading-normal tracking-wide text-muted-foreground">
            Fan conversation
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Thread actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href="/dashboard/divine-manager" className="flex items-center">
                  <Crown className="mr-2 h-4 w-4" />
                  Open Divine Manager
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (onOpenFanProfile) onOpenFanProfile()
                  else setInternalProfileOpen(true)
                }}
              >
                <User className="mr-2 h-4 w-4" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (conversation.platform !== 'onlyfans') {
                    setError('Fansly thread refresh is not available yet on web messages.')
                    return
                  }
                  setLoading(true)
                  fetch(`/api/onlyfans/messages/${conversation.user.id}?limit=100&refresh=1`)
                    .then((res) => res.json())
                    .then((data) => setMessages(normalizeAndSortMessages(data.messages || [])))
                    .finally(() => setLoading(false))
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Messages
              </DropdownMenuItem>
              {conversation.platform === 'onlyfans' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      const cid = String(conversation.chatId || conversation.user.id)
                      await fetch(`/api/onlyfans/chats/${encodeURIComponent(cid)}/read`, { method: 'POST' })
                    }}
                  >
                    <CheckCheck className="mr-2 h-4 w-4" />
                    Mark as read
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      const cid = String(conversation.chatId || conversation.user.id)
                      await fetch(`/api/onlyfans/chats/${encodeURIComponent(cid)}/unread`, { method: 'POST' })
                    }}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Mark as unread
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-default">
                      Auto-mark read when opening…
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="min-w-[14rem]">
                      <p className="px-2 py-1.5 text-[11px] text-muted-foreground leading-snug">
                        Controls whether Creatix tells OnlyFans this chat is read when you open it here. Default is off—use
                        Settings → Notifications to enable for all threads, or pick per thread below.
                      </p>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => void setChatReadBehavior('inherit')}
                        className={onlyFansChatReadMode === 'inherit' ? 'bg-accent/60' : ''}
                      >
                        Use account default
                        {messagingReadPrefs?.auto_mark_on_open ? ' (on)' : ' (off)'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => void setChatReadBehavior('auto')}
                        className={onlyFansChatReadMode === 'auto' ? 'bg-accent/60' : ''}
                      >
                        Always for this thread
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => void setChatReadBehavior('never')}
                        className={onlyFansChatReadMode === 'never' ? 'bg-accent/60' : ''}
                      >
                        Never for this thread
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={async () => {
                      const cid = String(conversation.chatId || conversation.user.id)
                      const ok = window.confirm('Delete this chat on OnlyFans? This cannot be undone.')
                      if (!ok) return
                      const res = await fetch(`/api/onlyfans/chats/${encodeURIComponent(cid)}`, {
                        method: 'DELETE',
                      })
                      if (res.ok) onMessageSent?.()
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete chat
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Scroll: thread + Divine AI — composer stays pinned below so send/input never clip */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={messagesContainerRef}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden"
        >
        <div className="p-3 sm:p-4">
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center sm:min-h-[240px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center text-center sm:min-h-[240px]">
            <p className="text-sm text-destructive">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => {
                if (conversation.platform !== 'onlyfans') {
                  setError('Fansly thread view is not available yet on web messages.')
                  return
                }
                setError(null)
                setLoading(true)
                fetch(`/api/onlyfans/messages/${conversation.user.id}?limit=100&refresh=1`)
                  .then(res => res.json())
                  .then(data => setMessages(normalizeAndSortMessages(data.messages || [])))
                  .catch(e => setError(e.message))
                  .finally(() => setLoading(false))
              }}
            >
              Try Again
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center text-center sm:min-h-[240px]">
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground">Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const fromId = msg.fromUser?.id
              const isCreator =
                typeof msg.isSentByMe === 'boolean'
                  ? msg.isSentByMe
                  : String(fromId ?? '') !== String(conversation.user.id)
              const mid = String(msg.id)
              const sendSource = isCreator ? resolveDmSendSource(dmSendSourceByMessageId, mid) : 'user'
              const isAiAssisted = isCreator && sendSource !== 'user'
              const creatorStyles = isCreator ? creatorBubbleStyles(sendSource) : null
              const fanSavedDeletedOnOF =
                !isCreator && Boolean(msg._creatix?.removedFromPlatformAt)
              return (
                <div
                  key={msg.id}
                  className={cn(
                    'flex',
                    isCreator ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[82%] rounded-2xl px-4 py-2',
                      fanSavedDeletedOnOF
                        ? 'border-2 border-red-500/55 bg-red-950/55 text-red-50 shadow-[0_0_0_1px_rgba(239,68,68,0.2)] dark:bg-red-950/70'
                        : isCreator && creatorStyles
                          ? creatorStyles.bubble
                          : 'bg-secondary text-secondary-foreground'
                    )}
                  >
                    {isAiAssisted && creatorStyles?.badgeLabel ? (
                      <p
                        className={cn(
                          'mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide',
                          creatorStyles.badgeMuted,
                        )}
                      >
                        <Sparkles className="h-3 w-3" />
                        {creatorStyles.badgeLabel}
                      </p>
                    ) : null}
                    {msg.media && msg.media.length > 0 && (
                      <div className="mb-2 space-y-2">
                        {msg.media.map((m) => (
                          <ChatMediaItem key={m.id} media={m} platform={conversation.platform} />
                        ))}
                      </div>
                    )}
                    {/* Show preview images if media array is empty but previews exist */}
                    {(!msg.media || msg.media.length === 0) && msg.previews && msg.previews.length > 0 && (
                      <div className="mb-2 space-y-2">
                        {msg.previews.map((p, idx) => (
                          <ChatPreviewImage key={idx} rawUrl={p.url} platform={conversation.platform} />
                        ))}
                      </div>
                    )}
                    {msg.text && (
                      <p
                        className={cn(
                          'text-sm whitespace-pre-wrap',
                          fanSavedDeletedOnOF && 'text-red-50',
                        )}
                      >
                        {stripHtml(msg.text)}
                      </p>
                    )}
                    {msg._creatix?.removedFromPlatformAt ? (
                      <div className="mt-2 space-y-2">
                        <p
                          className={cn(
                            'text-[11px] font-semibold leading-snug',
                            fanSavedDeletedOnOF
                              ? 'text-red-200'
                              : isCreator && creatorStyles
                                ? creatorStyles.bodyMuted
                                : 'text-muted-foreground',
                          )}
                        >
                          {fanSavedDeletedOnOF
                            ? 'Fan deleted this on OnlyFans — we kept a red copy in your Creatix database.'
                            : 'Removed on OnlyFans — still in your Creatix history.'}
                        </p>
                        {fanSavedDeletedOnOF && conversation.platform === 'onlyfans' ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={purgingCacheIds.has(String(msg.id))}
                            className="h-8 border-red-400/50 bg-red-950/40 text-xs text-red-100 hover:bg-red-900/50 hover:text-red-50"
                            onClick={() => {
                              const mid = String(msg.id)
                              if (!conversation?.user?.id) return
                              if (!window.confirm('Remove this saved copy from Creatix? This cannot be undone.')) return
                              setPurgingCacheIds((prev) => new Set(prev).add(mid))
                              void fetch(
                                `/api/onlyfans/messages/${encodeURIComponent(String(conversation.user.id))}/cache/${encodeURIComponent(mid)}`,
                                { method: 'DELETE', credentials: 'include' },
                              )
                                .then(async (res) => {
                                  if (!res.ok) {
                                    const j = await res.json().catch(() => ({}))
                                    throw new Error(typeof j.error === 'string' ? j.error : 'Could not remove')
                                  }
                                  setMessages((prev) => prev.filter((m) => String(m.id) !== mid))
                                })
                                .catch((err) => {
                                  setError(err instanceof Error ? err.message : 'Could not remove saved message')
                                })
                                .finally(() => {
                                  setPurgingCacheIds((prev) => {
                                    const next = new Set(prev)
                                    next.delete(mid)
                                    return next
                                  })
                                })
                            }}
                          >
                            {purgingCacheIds.has(String(msg.id)) ? (
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                            )}
                            Remove from Creatix
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                    {msg.price != null && Number(msg.price) > 0 && !msg.isPaid && (
                      <Badge className="mt-2 bg-chart-4/20 text-chart-4">
                        <DollarSign className="mr-1 h-3 w-3" />
                        PPV ${msg.price}
                      </Badge>
                    )}
                    <p
                      className={cn(
                        'mt-1 text-xs',
                        fanSavedDeletedOnOF
                          ? 'text-red-200/75'
                          : isCreator && creatorStyles
                            ? creatorStyles.timestamp
                            : isCreator
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                      )}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              )
            })}
            <div className="h-0 shrink-0" aria-hidden />
          </div>
        )}
        </div>
        </div>

        {showScrollLatestFab && (
          <button
            type="button"
            className={cn(
              'messages-scroll-latest-fab absolute z-20 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-opacity duration-300 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card',
              reserveDivineCrownSpace
                ? 'bottom-3 right-[5.25rem] sm:right-[5.75rem]'
                : 'bottom-3 right-3',
            )}
            aria-label="Scroll to latest messages"
            title="Scroll to latest messages"
            onClick={() => smoothScrollThreadToBottom()}
          >
            <span
              className="pointer-events-none absolute inset-[-3px] rounded-full bg-[conic-gradient(from_0deg,#fbbf24,#a855f7,#e9d5ff,#f59e0b,#7c3aed,#d8b4fe,#fbbf24)] opacity-[0.95] motion-reduce:animate-none animate-[spin_14s_linear_infinite]"
              aria-hidden
            />
            <span className="relative z-10 flex h-9 w-9 flex-col items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-amber-950 shadow-md dark:from-amber-400 dark:via-amber-500 dark:to-amber-600">
              <Crown className="h-[1.15rem] w-[1.15rem] shrink-0" aria-hidden />
              <ChevronsDown className="-mt-0.5 h-2.5 w-2.5 opacity-90" aria-hidden />
            </span>
          </button>
        )}

        </div>

        {/* Divine AI scrolls with the thread so the composer below never gets pushed off-screen */}
        <div className="shrink-0 border-t border-border/70 bg-card/95">
          <Collapsible open={aiSectionOpen} onOpenChange={setAiSectionOpen}>
            <div className="flex items-center gap-2 border-b border-border/60 px-2 py-1.5 sm:px-3">
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 min-w-0 flex-1 justify-start gap-2 px-2 text-left text-xs font-medium sm:flex-none"
                >
                  {aiSectionOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
                  )}
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">Divine AI — scan & suggestions</span>
                </Button>
              </CollapsibleTrigger>
              <span className="hidden shrink-0 text-[10px] text-muted-foreground md:inline">Not sent to fan</span>
            </div>
            <CollapsibleContent>
              <div className="space-y-2 overflow-y-auto bg-muted/15 px-3 py-2 pb-3 sm:px-4 sm:py-3">
              {scanInsights && (
                <div className="space-y-1 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 font-medium text-primary">
                      <Sparkles className="h-3 w-3" />
                      Thread scan insights
                    </div>
                    <button
                      type="button"
                      className="text-[10px] text-primary/70 hover:underline"
                      onClick={() => setScanInsights(null)}
                    >
                      Clear
                    </button>
                  </div>
                  {scanInsights.insights?.length > 0 && (
                    <ul className="list-disc pl-4">
                      {scanInsights.insights.slice(0, 3).map((i, idx) => (
                        <li key={idx}>{i}</li>
                      ))}
                    </ul>
                  )}
                  {scanInsights.riskFlags?.length > 0 && (
                    <p className="text-destructive/80">
                      Risks: {scanInsights.riskFlags.slice(0, 3).join('; ')}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  disabled={suggestionsLoading === 'scan' || messages.length === 0}
                  onClick={() => callSuggestionApi('scan')}
                >
                  {suggestionsLoading === 'scan' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  Scan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 border-circe/40 text-xs text-circe-light"
                  disabled={suggestionsLoading === 'circe' || messages.length === 0}
                  onClick={() => callSuggestionApi('circe')}
                >
                  {suggestionsLoading === 'circe' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Moon className="h-3 w-3" />
                  )}
                  Circe
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 border-gold/50 text-xs text-gold"
                  disabled={suggestionsLoading === 'venus' || messages.length === 0}
                  onClick={() => callSuggestionApi('venus')}
                >
                  {suggestionsLoading === 'venus' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sun className="h-3 w-3" />
                  )}
                  Venus
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 border-pink-500/50 text-xs text-pink-500"
                  disabled={suggestionsLoading === 'flirt' || messages.length === 0}
                  onClick={() => callSuggestionApi('flirt')}
                >
                  {suggestionsLoading === 'flirt' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Heart className="h-3 w-3" />
                  )}
                  Flirt
                </Button>
              </div>

              {(activePanel === 'circe' && circeSuggestions) ||
              (activePanel === 'venus' && venusSuggestions) ||
              (activePanel === 'flirt' && flirtSuggestions) ? (
                <div className="space-y-2 rounded-md border border-border bg-secondary/40 p-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">
                      {activePanel === 'circe'
                        ? 'Circe suggestions'
                        : activePanel === 'venus'
                          ? 'Venus suggestions'
                          : 'Flirt suggestions'}
                    </span>
                    <button
                      type="button"
                      className="text-[10px] text-muted-foreground hover:underline"
                      onClick={() => setActivePanel(null)}
                    >
                      Close
                    </button>
                  </div>
                  <div className="space-y-1">
                    {(activePanel === 'circe'
                      ? circeSuggestions
                      : activePanel === 'venus'
                        ? venusSuggestions
                        : flirtSuggestions
                    )
                      ?.slice(0, 3)
                      .map((text, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="w-full rounded border border-border bg-background px-2 py-1.5 text-left text-xs leading-snug hover:border-primary hover:bg-primary/5"
                          onClick={() => {
                            const panel = activePanel
                            setActivePanel(null)
                            if (panel === 'circe' || panel === 'venus' || panel === 'flirt') {
                              pendingComposerSuggestionRef.current = panel
                            }
                            void applyComposerTextAnimated(text, true, { skipAnimation: false })
                          }}
                        >
                          {text}
                        </button>
                      ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Tap to insert — edit before sending.
                  </p>
                </div>
              ) : null}

              <p className="text-[10px] leading-snug text-muted-foreground/90">
                Only the fan thread above is visible to fans. Scan & suggestions stay in Creatix until you send.
              </p>
            </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

      {/* Composer + send: fixed to bottom of chat card (always visible) */}
      <div className="flex flex-shrink-0 flex-col border-t-2 border-border bg-card shadow-[0_-6px_20px_rgba(0,0,0,0.12)] dark:shadow-[0_-6px_24px_rgba(0,0,0,0.45)]">
        {error && messages.length > 0 && (
          <div className="border-b border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive sm:px-4">
            {error}
          </div>
        )}

        <div
          className={cn(
            'space-y-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-4 sm:pb-3',
            /* Fixed Divine crown (~3.5rem) + edge inset — keep mic + send clear */
            reserveDivineCrownSpace && 'pb-1 pr-[5rem] sm:pr-[6rem]',
          )}
        >
          <input
            ref={chatFileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleChatFileUpload}
          />
          {(attachedMediaIds.length > 0 || ppvPrice) && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {attachedMediaIds.length > 0 && (
                <span className="text-muted-foreground">
                  {attachedMediaIds.length} attachment{attachedMediaIds.length > 1 ? 's' : ''}
                </span>
              )}
              {ppvPrice && (
                <Badge className="bg-chart-4/20 text-chart-4">
                  <DollarSign className="mr-1 h-3 w-3" />
                  PPV ${ppvPrice}
                </Badge>
              )}
            </div>
          )}

          <div className="flex min-w-0 items-end gap-2">
            <div className="flex shrink-0 flex-col gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11"
                disabled={!isOnlyFansConversation || uploadingMedia}
                onClick={() => chatFileInputRef.current?.click()}
                title={
                  isOnlyFansConversation
                    ? 'Attach photo or video (PPV)'
                    : 'Media only for OnlyFans'
                }
              >
                {uploadingMedia ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
              </Button>
              <div className="flex items-center gap-0.5">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="PPV"
                  value={ppvPrice}
                  onChange={(e) => setPpvPrice(e.target.value)}
                  className="h-8 w-[3.25rem] px-1.5 text-xs"
                  title="Optional PPV price"
                />
              </div>
            </div>

            <div className="relative min-w-0 max-w-full flex-1">
              {(divineTyping || divineScheduleSeconds != null) && (
                <div className="pointer-events-none absolute inset-x-0 -top-5 z-10 flex items-center gap-1.5 text-[11px] font-medium text-amber-200/95 dark:text-amber-300/90">
                  {divineTyping ? (
                    <>
                      <span className="inline-flex gap-0.5">
                        <span className="h-1 w-1 animate-bounce rounded-full bg-amber-400 [animation-delay:0ms]" />
                        <span className="h-1 w-1 animate-bounce rounded-full bg-violet-400 [animation-delay:150ms]" />
                        <span className="h-1 w-1 animate-bounce rounded-full bg-amber-400 [animation-delay:300ms]" />
                      </span>
                      <span className="tracking-tight">Divine is typing…</span>
                    </>
                  ) : (
                    <span className="tracking-tight tabular-nums text-violet-200/95 dark:text-violet-300/90">
                      Sending in {divineScheduleSeconds}s…
                    </span>
                  )}
                </div>
              )}
              <Textarea
                placeholder="Message… (Shift+Enter for new line)"
                value={message}
                onChange={(e) => {
                  if (divineTyping) {
                    composerTypeAbortRef.current?.abort()
                    composerTypeAbortRef.current = null
                    setDivineTyping(false)
                  }
                  setMessage(e.target.value)
                }}
                rows={1}
                className={cn(
                  'min-h-[3.25rem] resize-y bg-input pr-11 text-sm leading-relaxed sm:min-h-[3.75rem] sm:pr-12 sm:text-sm',
                  divineComposerHighlight &&
                    'ring-2 ring-amber-400/55 ring-offset-0 shadow-[0_0_0_1px_rgba(234,179,8,0.35),0_0_22px_rgba(147,51,234,0.45)] dark:ring-amber-400/45 dark:shadow-[0_0_0_1px_rgba(251,191,36,0.25),0_0_26px_rgba(168,85,247,0.4)]',
                )}
                disabled={sending || !isOnlyFansConversation}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (message.trim() || attachedMediaIds.length > 0) handleSendMessage()
                  }
                }}
              />
              <div className="absolute bottom-2 right-2">
                <VoiceInputButton
                  onTranscript={(text) => {
                    if (divineTyping) {
                      composerTypeAbortRef.current?.abort()
                      composerTypeAbortRef.current = null
                      setDivineTyping(false)
                    }
                    setMessage((prev) => prev + (prev ? ' ' : '') + text)
                  }}
                  size="sm"
                  variant="ghost"
                />
              </div>
            </div>

            <Button
              size="icon"
              className="h-11 w-11 shrink-0"
              disabled={(!message.trim() && attachedMediaIds.length === 0) || sending || !isOnlyFansConversation}
              onClick={handleSendMessage}
            >
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>

          <p className="hidden text-[10px] text-muted-foreground sm:block">
            PPV: set price and/or attach media. Fan only sees the conversation above.
          </p>
          <p className="text-[10px] text-muted-foreground sm:hidden">
            Scroll the thread for older messages; type and send stay fixed here.
          </p>
        </div>
      </div>
      {!onOpenFanProfile && (
        <FanProfileModal
          open={internalProfileOpen}
          onOpenChange={setInternalProfileOpen}
          fanId={String(fan.id)}
          platform={conversation.platform === 'onlyfans' ? 'onlyfans' : 'fansly'}
          initialUsername={fan.username}
          initialName={fan.name}
          initialAvatar={fan.avatar}
        />
      )}
    </Card>
  )
}
