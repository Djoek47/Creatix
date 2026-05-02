'use client'

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import {
  Send,
  Paperclip,
  DollarSign,
  Settings,
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
  MessageCircle,
  Shield,
  Mic,
  PenLine,
  TrendingUp,
  AlertTriangle,
  MessageSquarePlus,
} from 'lucide-react'
import { VoiceInputButton } from '@/components/voice-input-button'
import { SidebarDivineManagerCrown } from '@/components/dashboard/sidebar-divine-manager-crown'
import { useDivinePanel } from '@/components/divine/divine-panel-context'
import { useVoiceSession } from '@/components/divine/voice-session-context'
import { cn } from '@/lib/utils'
import { DASHBOARD_CREDIT_SUMMARY_MARK } from '@/lib/dashboard-credit-summary-marker'
import { stripHtml } from '@/lib/html-utils'
import type { NormalizedChatMessage } from '@/lib/ai/message-suggestions'
import { createClient } from '@/lib/supabase/client'
import { isBoundaryNiche } from '@/lib/niches'
import { proxyImageUrl } from '@/lib/proxy-image-url'
import { getProxiedMediaPresentation, isVideoMedia, type RawOnlyFansMedia } from '@/lib/messages/of-media'
import { FanProfileModal } from '@/components/messages/fan-profile-modal'
import {
  effectiveChatReadMode,
  mergeMessagingReadPrefs,
  shouldAutoMarkOnOpen,
  type MessagingReadPreferences,
} from '@/lib/messaging-read-preferences'
import { uiFadeTransition, useUiMotionPreferences } from '@/components/ui/motion-presets'
import { useIsMobile } from '@/hooks/use-mobile'
import { useMessagesFocusChromeOptional } from '@/components/messages/messages-focus-chrome-context'
import { PlatformConnector } from '@/components/platform/platform-connector'

const FOLLOW_THREAD_LATEST_KEY = 'creatix-messages-follow-latest'

/** Logged in `divine_dm_send_events` — drives creator bubble color + AI-assisted label. */
type DmSendSource = 'user' | 'divine' | 'divine_scheduled' | 'circe' | 'venus' | 'flirt' | 'mimic'
type BillingCreditSnapshot = {
  wallet?: {
    totalRemaining?: number
    includedRemaining?: number
    purchasedRemaining?: number
  }
}

function isDmSendSource(s: string): s is DmSendSource {
  return (
    s === 'user' ||
    s === 'divine' ||
    s === 'divine_scheduled' ||
    s === 'circe' ||
    s === 'venus' ||
    s === 'flirt' ||
    s === 'mimic'
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
  const t = useTranslations('messages.chat')
  return (
    <div className={cn('space-y-1', compact ? 'text-left' : 'text-center')}>
      <p className="text-sm text-muted-foreground">
        {platform === 'fansly' ? t('platformElsewhereFansly') : t('platformElsewhereOnlyfans')}
      </p>
    </div>
  )
}

function creatorBubbleStyles(
  source: DmSendSource,
  tChat: ReturnType<typeof useTranslations<'messages.chat'>>,
): {
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
        badgeLabel: tChat('badges.flirt'),
        badgeMuted: 'text-pink-200/95',
        bodyMuted: 'text-pink-200/80',
      }
    case 'circe':
      return {
        bubble:
          'border border-violet-400/50 bg-violet-950/45 text-violet-50 shadow-[0_0_0_1px_rgba(139,92,246,0.2)]',
        timestamp: 'text-violet-200/70',
        badgeLabel: tChat('badges.circe'),
        badgeMuted: 'text-violet-200/90',
        bodyMuted: 'text-violet-200/80',
      }
    case 'venus':
      return {
        bubble:
          'border border-amber-400/45 bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950 shadow-[0_0_0_1px_rgba(245,158,11,0.35)]',
        timestamp: 'text-amber-950/80',
        badgeLabel: tChat('badges.venus'),
        badgeMuted: 'text-amber-950/90',
        bodyMuted: 'text-amber-950/85',
      }
    case 'mimic':
      return {
        bubble:
          'border border-sky-400/45 bg-gradient-to-br from-sky-500/85 to-cyan-700/85 text-sky-50 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]',
        timestamp: 'text-sky-100/80',
        badgeLabel: tChat('badges.mimic'),
        badgeMuted: 'text-sky-100/90',
        bodyMuted: 'text-sky-100/80',
      }
    case 'divine':
    case 'divine_scheduled':
      return {
        bubble:
          'border border-violet-400/50 bg-violet-950/35 text-violet-50 shadow-[0_0_0_1px_rgba(139,92,246,0.2)]',
        timestamp: 'text-violet-200/70',
        badgeLabel: tChat('badges.divine'),
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
  /** Empty inbox + no platform: show OnlyFans / Fansly connect actions instead of settings-only copy. */
  showPlatformConnectActions?: boolean
  /** Mobile message-first: flatten card chrome; fan title lives in inbox header. */
  compactMobileChrome?: boolean
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
  const tChat = useTranslations('messages.chat')
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
        <p className="text-sm text-muted-foreground">{tChat('lockedMedia')}</p>
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
              {tChat('mediaTryOpenLink')}
              {platform === 'fansly' ? tChat('mediaMayRequireFansly') : tChat('mediaMayRequireOnlyfans')}
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
        className="rounded-lg max-w-full object-contain w-full max-h-[62vh] bg-black/30"
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
      alt={tChat('mediaAlt')}
      className="rounded-lg max-w-full h-auto object-contain max-h-[62vh]"
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
  const tChat = useTranslations('messages.chat')
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
      alt={tChat('previewAlt')}
      className="rounded-lg max-w-full h-auto object-contain max-h-[62vh]"
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

/** Thread overflow menu — glass surface + calmer item chrome (matches chat card language). */
const threadToolsDropdownContentClass = cn(
  'w-[min(100vw-1.25rem,20rem)]',
  'rounded-2xl border border-white/26 bg-white/[0.78] p-2 shadow-[0_26px_88px_-32px_rgba(15,23,42,0.32)] backdrop-blur-2xl backdrop-saturate-[1.35]',
  'dark:border-white/[0.085] dark:bg-slate-950/[0.72] dark:shadow-[0_32px_100px_-36px_rgba(0,0,0,0.72)]',
  'ring-1 ring-black/[0.035] dark:ring-white/[0.06]',
  '[&_[data-slot=dropdown-menu-separator]]:my-2.5 [&_[data-slot=dropdown-menu-separator]]:bg-border/45',
)

const threadToolsMenuItemClass = cn(
  'gap-3 rounded-[11px] px-3 py-2.5 text-[15px] font-medium tracking-[-0.015em] transition-colors duration-200',
  '[&_svg]:size-[17px] [&_svg]:shrink-0 [&_svg]:opacity-[0.88]',
  'focus:bg-foreground/[0.055] focus:text-foreground data-[highlighted]:bg-foreground/[0.055] data-[highlighted]:text-foreground',
  'dark:focus:bg-white/[0.06] dark:data-[highlighted]:bg-white/[0.06]',
)

const threadToolsMenuItemSelectedClass = cn(
  'bg-foreground/[0.05] ring-1 ring-inset ring-foreground/[0.08]',
  'focus:bg-foreground/[0.07] data-[highlighted]:bg-foreground/[0.07]',
  'dark:bg-white/[0.05] dark:ring-white/[0.09]',
  'dark:focus:bg-white/[0.075] dark:data-[highlighted]:bg-white/[0.075]',
)

export function ChatWindow({
  conversation,
  userId: _userId,
  chatterDraftOutboxId,
  onMessageSent,
  onOpenFanProfile,
  nullConversationTitle,
  nullConversationDescription,
  showPlatformConnectActions = false,
  compactMobileChrome = false,
}: ChatWindowProps) {
  const tChat = useTranslations('messages.chat')
  const { reduced } = useUiMotionPreferences()
  const fadeTransition = uiFadeTransition(reduced)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<OnlyFansMessage[]>([])
  const [threadStaleReason, setThreadStaleReason] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState<
    'scan' | 'circe' | 'venus' | 'flirt' | 'mimic' | null
  >(null)
  const [scanInsights, setScanInsights] = useState<{
    insights: string[]
    riskFlags: string[]
    suggestedAngles: string[]
  } | null>(null)
  const [circeSuggestions, setCirceSuggestions] = useState<string[] | null>(null)
  const [venusSuggestions, setVenusSuggestions] = useState<string[] | null>(null)
  const [flirtSuggestions, setFlirtSuggestions] = useState<string[] | null>(null)
  const [mimicSuggestions, setMimicSuggestions] = useState<string[] | null>(null)
  const [ppvPrice, setPpvPrice] = useState<string>('')
  const [attachedMediaIds, setAttachedMediaIds] = useState<string[]>([])
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const chatFileInputRef = useRef<HTMLInputElement>(null)
  const [activePanel, setActivePanel] = useState<'circe' | 'venus' | 'flirt' | 'mimic' | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Pause OnlyFans message polling after 429 until this timestamp (ms). */
  const onlyFansPollBackoffUntilRef = useRef(0)
  /** Latest OnlyFans thread load request — avoids clearing messages when a stale load finishes. */
  const onlyFansLoadThreadSeqRef = useRef(0)
  const onlyFansThreadKeyRef = useRef<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const [niches, setNiches] = useState<string[]>([])
  const [boundaries, setBoundaries] = useState<string[]>([])
  const [flirtLevel, setFlirtLevel] = useState<number>(2)
  const [flirtKeywords, setFlirtKeywords] = useState<string>('')
  const [creatorPronouns, setCreatorPronouns] = useState<string | null>(null)
  const [creatorGenderIdentity, setCreatorGenderIdentity] = useState<string | null>(null)
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const divinePanel = useDivinePanel()
  const voiceSession = useVoiceSession()
  const reserveDivineCrownSpace = pathname?.startsWith('/dashboard/messages') === true
  const padComposerForDivineFab =
    reserveDivineCrownSpace &&
    (!isMobile || Boolean(voiceSession && voiceSession.status !== 'idle'))
  const openDivineVoiceLauncher = useCallback(() => {
    window.dispatchEvent(new CustomEvent('creatix:open-divine-voice-launcher'))
  }, [])
  /** OnlyFans message id → send attribution (from divine_dm_send_events + optimistic sends). */
  const [dmSendSourceByMessageId, setDmSendSourceByMessageId] = useState<Record<string, DmSendSource>>({})
  /** Next send after inserting Circe/Venus/Flirt/Mimic suggestion (Divine panel wins if set). */
  const pendingComposerSuggestionRef = useRef<'user' | 'circe' | 'venus' | 'flirt' | 'mimic'>('user')
  const [divineTyping, setDivineTyping] = useState(false)
  const [purgingCacheIds, setPurgingCacheIds] = useState<Set<string>>(() => new Set())
  /** Loaded when opening an OnlyFans thread; drives auto mark-as-read + per-thread override UI. */
  const [messagingReadPrefs, setMessagingReadPrefs] = useState<MessagingReadPreferences | null>(null)
  const [creditSnapshot, setCreditSnapshot] = useState<{
    totalRemaining: number
    includedRemaining: number
    purchasedRemaining: number
  } | null>(null)

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
  /** Mobile-only: compact Divine operator drawer from the composer tray (not fullscreen). */
  const [mobileDivineOperatorSheetOpen, setMobileDivineOperatorSheetOpen] = useState(false)
  const messagesFocusChrome = useMessagesFocusChromeOptional()
  useEffect(() => {
    if (messagesFocusChrome?.focusMode) setAiSectionOpen(true)
  }, [messagesFocusChrome?.focusMode])
  const lastGoodMessagesByConversationRef = useRef<Record<string, OnlyFansMessage[]>>({})
  const isOnlyFansConversation = conversation?.platform === 'onlyfans'
  const refreshCreditSnapshot = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/credit-snapshot', { credentials: 'include' })
      if (!res.ok) return
      const json = (await res.json().catch(() => ({}))) as BillingCreditSnapshot
      const wallet = json.wallet
      setCreditSnapshot({
        totalRemaining: Number(wallet?.totalRemaining ?? 0),
        includedRemaining: Number(wallet?.includedRemaining ?? 0),
        purchasedRemaining: Number(wallet?.purchasedRemaining ?? 0),
      })
    } catch {
      // ignore snapshot failures in chat UI
    }
  }, [])

  useEffect(() => {
    if (!aiSectionOpen) return
    void refreshCreditSnapshot()
  }, [aiSectionOpen, refreshCreditSnapshot, conversation?.user?.id])

  const onlyFansChatReadMode = useMemo(() => {
    if (!conversation || conversation.platform !== 'onlyfans' || !messagingReadPrefs) return null
    return effectiveChatReadMode(messagingReadPrefs, 'onlyfans', String(conversation.user.id))
  }, [conversation, messagingReadPrefs])

  useEffect(() => {
    pendingChatterOutboxIdRef.current = null
  }, [chatterDraftOutboxId, conversation?.user.id])

  useEffect(() => {
    setMobileDivineOperatorSheetOpen(false)
  }, [conversation?.user.id])

  useEffect(() => {
    if (!isMobile) setMobileDivineOperatorSheetOpen(false)
  }, [isMobile])

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
    if (isMobile) return
    const hasAiContent =
      scanInsights ||
      activePanel ||
      (circeSuggestions && circeSuggestions.length > 0) ||
      (venusSuggestions && venusSuggestions.length > 0) ||
      (flirtSuggestions && flirtSuggestions.length > 0) ||
      (mimicSuggestions && mimicSuggestions.length > 0)
    if (hasAiContent) setAiSectionOpen(true)
  }, [isMobile, scanInsights, activePanel, circeSuggestions, venusSuggestions, flirtSuggestions, mimicSuggestions])

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
  const [followThreadLatest, setFollowThreadLatest] = useState(true)
  const [chatDeleteDialogOpen, setChatDeleteDialogOpen] = useState(false)
  const [chatDeleteBusy, setChatDeleteBusy] = useState(false)
  const prevMsgLenForScrollRef = useRef(0)

  useEffect(() => {
    try {
      const v = typeof window !== 'undefined' ? window.localStorage.getItem(FOLLOW_THREAD_LATEST_KEY) : null
      if (v === 'false') setFollowThreadLatest(false)
    } catch {
      /* ignore */
    }
  }, [])

  const persistFollowLatest = useCallback((on: boolean) => {
    setFollowThreadLatest(on)
    try {
      window.localStorage.setItem(FOLLOW_THREAD_LATEST_KEY, on ? 'true' : 'false')
    } catch {
      /* ignore */
    }
  }, [])

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
    setMimicSuggestions(null)
    setActivePanel(dmSuggestionBridge.highlightPanel)
    clearDmSuggestionBridge()
  }, [conversation?.user?.id, dmSuggestionBridge, clearDmSuggestionBridge])

  const callSuggestionApi = async (mode: 'scan' | 'circe' | 'venus' | 'flirt' | 'mimic') => {
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

      const data = await res.json() as {
        error?: string
        code?: string
        insights?: { insights?: string[]; riskFlags?: string[]; suggestedAngles?: string[] }
        suggestions?: Array<{ text?: string }>
      }
      if (!res.ok || data.error) {
        const rateLimited = res.status === 429 || data.code === 'ONLYFANS_RATE_LIMIT'
        if (rateLimited) {
          onlyFansPollBackoffUntilRef.current = Date.now() + 90_000
        }
        throw new Error(
          data.error ||
            (rateLimited ? tChat('errorRateLimitedMimic') : tChat('errorGenerateSuggestions')),
        )
      }

      if (mode === 'scan') {
        const ins = data.insights
        setScanInsights({
          insights: ins?.insights ?? [],
          riskFlags: ins?.riskFlags ?? [],
          suggestedAngles: ins?.suggestedAngles ?? [],
        })
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
        } else if (mode === 'mimic') {
          setMimicSuggestions(texts.length ? texts : null)
          setActivePanel('mimic')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tChat('errorGenerateSuggestions'))
    } finally {
      setSuggestionsLoading(null)
      void refreshCreditSnapshot()
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

  const confirmDeleteOnlyFansChat = useCallback(async () => {
    if (!conversation || conversation.platform !== 'onlyfans') return
    const cid = String(conversation.chatId || conversation.user.id)
    setChatDeleteBusy(true)
    try {
      const res = await fetch(`/api/onlyfans/chats/${encodeURIComponent(cid)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setChatDeleteDialogOpen(false)
        onMessageSent?.()
      } else {
        setError(tChat('deleteChatFailedRetry'))
      }
    } catch {
      setError(tChat('deleteChatFailed'))
    } finally {
      setChatDeleteBusy(false)
    }
  }, [conversation, onMessageSent, tChat])

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversation) {
      onlyFansThreadKeyRef.current = null
      setMessages([])
      setThreadStaleReason(null)
      setMessagingReadPrefs(null)
      return
    }

    const conversationKey = `${conversation.platform}:${String(conversation.user.id)}`
    const cachedMessages = lastGoodMessagesByConversationRef.current[conversationKey]
    const threadKey = `${conversation.platform}:${conversation.user.id}`
    if (threadKey !== onlyFansThreadKeyRef.current) {
      onlyFansThreadKeyRef.current = threadKey
      if (Array.isArray(cachedMessages) && cachedMessages.length > 0) {
        setMessages(cachedMessages)
      } else {
        setMessages([])
      }
      setDmSendSourceByMessageId({})
    }
    setThreadStaleReason(null)
    const loadMessages = async () => {
      const seq = ++onlyFansLoadThreadSeqRef.current
      setLoading(true)
      setError(null)

      try {
        if (conversation.platform !== 'onlyfans') {
          if (seq !== onlyFansLoadThreadSeqRef.current) return
          setMessages([])
          setError(tChat('fanslyThreadViewUnavailable'))
          return
        }
        const res = await fetch(`/api/onlyfans/messages/${conversation.user.id}?limit=100`)
        let data: {
          error?: string
          code?: string
          messages?: OnlyFansMessage[]
          source?: 'cache' | 'onlyfans' | string
          stale?: boolean
        } = {}
        try {
          data = (await res.json()) as typeof data
        } catch {
          data = {}
        }

        if (seq !== onlyFansLoadThreadSeqRef.current) return

        if (!res.ok) {
          const rateLimited = res.status === 429 || data.code === 'ONLYFANS_RATE_LIMIT'
          const upstreamGlitch =
            res.status === 503 || data.code === 'ONLYFANS_UPSTREAM'
          if (rateLimited || upstreamGlitch) {
            onlyFansPollBackoffUntilRef.current = Date.now() + 90_000
          }
          throw new Error(
            data.error ||
              (rateLimited
                ? tChat('errorRateLimited')
                : upstreamGlitch
                  ? tChat('errorUpstreamGlitch')
                  : tChat('errorLoadFailed')),
          )
        }

        const staleRateLimit =
          data.code === 'ONLYFANS_RATE_LIMIT' && (data.stale === true || data.source === 'cache')
        const staleUpstream =
          data.code === 'ONLYFANS_UPSTREAM' && (data.stale === true || data.source === 'cache')
        if (staleRateLimit || staleUpstream) {
          onlyFansPollBackoffUntilRef.current = Date.now() + 90_000
        }

        const normalized = normalizeAndSortMessages(data.messages || [])
        setMessages(normalized)
        lastGoodMessagesByConversationRef.current[conversationKey] = normalized
        if (data.stale === true || data.source === 'cache') {
          setThreadStaleReason(tChat('threadStaleCached'))
        } else {
          setThreadStaleReason(null)
        }

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
        if (seq !== onlyFansLoadThreadSeqRef.current) return
        setError(err instanceof Error ? err.message : tChat('errorLoadFailed'))
        if (Array.isArray(cachedMessages) && cachedMessages.length > 0) {
          setThreadStaleReason(tChat('threadStaleLastKnown'))
        }
      } finally {
        if (seq === onlyFansLoadThreadSeqRef.current) {
          setLoading(false)
        }
      }
    }

    loadMessages()
    // Prefer id + platform over full `conversation` so parents that pass inline objects
    // (or stale memo) cannot retrigger this effect every render (React #185).
    // Do not depend on `onMessageSent` — parent identity changes must not wipe the thread.
  }, [conversation?.user?.id, conversation?.platform, tChat])

  // After paint: snap to bottom when opening; follow new messages when opted in; otherwise only if near bottom.
  useLayoutEffect(() => {
    if (!conversation || loading) return
    const el = messagesContainerRef.current
    if (!el) return
    const convId = String(conversation.user.id)

    if (prevConvIdForScrollRef.current !== convId) {
      prevConvIdForScrollRef.current = convId
      didSnapBottomForConvRef.current = null
      prevMsgLenForScrollRef.current = 0
    }

    const messageCount = messages.length
    const grew = messageCount > prevMsgLenForScrollRef.current
    prevMsgLenForScrollRef.current = messageCount

    if (el.scrollHeight <= el.clientHeight + 2) return

    const thresholdPx = 120
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < thresholdPx
    const needInitialSnap = didSnapBottomForConvRef.current !== convId

    if (needInitialSnap) {
      el.scrollTop = el.scrollHeight
      didSnapBottomForConvRef.current = convId
      return
    }

    if (followThreadLatest && grew) {
      el.scrollTop = el.scrollHeight
      return
    }

    if (nearBottom) {
      el.scrollTop = el.scrollHeight
    }
  }, [conversation, loading, messages, followThreadLatest])

  // Poll for new messages (OnlyFans route only). Delay first poll + slower interval to reduce rate-limit bursts with voice navigation + thread refresh.
  useEffect(() => {
    if (!conversation || conversation.platform !== 'onlyfans') return
    if (loading) return

    const poll = async () => {
      if (!conversation) return
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
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
        if (
          res.status === 429 ||
          data.code === 'ONLYFANS_RATE_LIMIT' ||
          res.status === 503 ||
          data.code === 'ONLYFANS_UPSTREAM'
        ) {
          onlyFansPollBackoffUntilRef.current = Date.now() + 120_000
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
      pollIntervalRef.current = setInterval(poll, 25_000)
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
      setError(tChat('uploadMediaFailed'))
    } finally {
      setUploadingMedia(false)
      e.target.value = ''
    }
  }, [conversation?.platform, tChat])

  const handleSendMessage = useCallback(async () => {
    if ((!message.trim() && attachedMediaIds.length === 0) || !conversation || sending) return
    if (conversation.platform !== 'onlyfans') {
      setError(tChat('fanslySendNotAvailable'))
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
      const body: {
        text: string
        mediaIds?: string[]
        price?: number
      } = { text: messageText }
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
        throw new Error(data.error || tChat('errorSendMessage'))
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
              platform: 'onlyfans',
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
          platform: 'onlyfans',
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
      setError(err instanceof Error ? err.message : tChat('errorSendMessage'))
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
    tChat,
  ])

  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage
  }, [handleSendMessage])

  if (!conversation) {
    const title = nullConversationTitle ?? tChat('selectConversation')
    const description = nullConversationDescription
    return (
      <Card
        className={cn(
          'flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-white/40 bg-white/55 py-0 shadow-[0_22px_60px_-28px_rgba(15,23,42,0.3)] backdrop-blur-2xl backdrop-saturate-150',
          'dark:border-white/[0.10] dark:bg-slate-950/48 dark:shadow-[0_24px_68px_-30px_rgba(0,0,0,0.55)]',
        )}
      >
        <div className="flex w-full max-w-lg flex-col items-center px-8 py-12 text-center">
          {!showPlatformConnectActions ? (
            <div
              className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-border/50 bg-muted/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] dark:bg-muted/25"
              aria-hidden
            >
              <MessageCircle className="h-8 w-8 text-muted-foreground/65" strokeWidth={1.5} />
            </div>
          ) : null}
          <p className="text-[1.0625rem] font-semibold tracking-tight text-foreground">{title}</p>
          {showPlatformConnectActions ? (
            description ? (
              <p className="mt-3 max-w-sm text-[0.9375rem] leading-relaxed text-muted-foreground">{description}</p>
            ) : (
              <p className="mt-3 max-w-sm text-[0.9375rem] leading-relaxed text-muted-foreground">
                {tChat('signInPlatformsHint')}
              </p>
            )
          ) : description ? (
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">{description}</p>
          ) : (
            <p className="mt-2 text-[0.9375rem] text-muted-foreground">{tChat('toStartMessaging')}</p>
          )}
          {showPlatformConnectActions ? (
            <div className="mt-8 w-full max-w-md">
              <PlatformConnector bareConnect />
            </div>
          ) : null}
        </div>
      </Card>
    )
  }

  const fan = conversation.user

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={fadeTransition}
      className="flex min-h-0 flex-1"
    >
    <Card
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-0 overflow-hidden rounded-2xl border border-white/40 bg-white/55 py-0 shadow-[0_22px_60px_-28px_rgba(15,23,42,0.3)] backdrop-blur-2xl backdrop-saturate-150',
        'dark:border-white/[0.10] dark:bg-slate-950/48 dark:shadow-[0_24px_68px_-30px_rgba(0,0,0,0.55)]',
        compactMobileChrome &&
          'rounded-none border-x-0 border-t border-b-0 border-white/25 shadow-none sm:rounded-2xl sm:border-x sm:border-white/40 sm:shadow-[0_22px_60px_-28px_rgba(15,23,42,0.3)] dark:sm:border-white/[0.10]',
      )}
    >
      {/* Label + thread actions — hidden on compact mobile (identity is in inbox header). */}
      {!compactMobileChrome ? (
      <div className="z-10 shrink-0 border-b border-border/35 bg-background/25 px-3.5 py-2.5 backdrop-blur-md sm:px-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase leading-normal tracking-[0.14em] text-muted-foreground">
            {tChat('fanConversation')}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'thread-toolbar-gear-btn relative isolate shrink-0 overflow-visible rounded-full',
                  'outline-none ring-sidebar-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  'transition-[filter] duration-300 hover:brightness-[1.06]',
                )}
                aria-haspopup="menu"
                aria-label={tChat('threadToolsAria')}
              >
                <span
                  className="thread-toolbar-gear-rim pointer-events-none absolute inset-[-3px] z-0 rounded-full bg-[conic-gradient(from_0deg,#fbbf24,#a855f7,#e9d5ff,#f59e0b,#7c3aed,#d8b4fe,#fbbf24)] opacity-[0.92]"
                  aria-hidden
                />
                <span
                  className={cn(
                    'relative z-[1] flex h-[34px] w-[34px] items-center justify-center rounded-full',
                    'border border-white/18 bg-background/94 backdrop-blur-sm dark:bg-slate-950/92',
                    'shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]',
                  )}
                >
                  <Settings className="thread-toolbar-gear-icon h-[17px] w-[17px] text-amber-200/92" aria-hidden />
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={threadToolsDropdownContentClass}>
              <DropdownMenuItem asChild className={threadToolsMenuItemClass}>
                <a href="/dashboard/divine-manager" className="flex items-center">
                  <Crown className="text-foreground/80" aria-hidden />
                  {tChat('openDivineManager')}
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem
                className={threadToolsMenuItemClass}
                onClick={() => {
                  if (onOpenFanProfile) onOpenFanProfile()
                  else setInternalProfileOpen(true)
                }}
              >
                <User className="text-foreground/80" aria-hidden />
                {tChat('viewProfile')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={threadToolsMenuItemClass}
                onClick={() => {
                  if (conversation.platform !== 'onlyfans') {
                    setError(tChat('fanslyRefreshNotAvailable'))
                    return
                  }
                  setLoading(true)
                  fetch(`/api/onlyfans/messages/${conversation.user.id}?limit=100&refresh=1`)
                    .then((res) => res.json())
                    .then((data: { messages?: OnlyFansMessage[]; source?: string; stale?: boolean }) => {
                      const normalized = normalizeAndSortMessages(data.messages || [])
                      setMessages(normalized)
                      lastGoodMessagesByConversationRef.current[
                        `${conversation.platform}:${String(conversation.user.id)}`
                      ] = normalized
                      if (data.stale === true || data.source === 'cache') {
                        setThreadStaleReason(tChat('threadStaleCached'))
                      } else {
                        setThreadStaleReason(null)
                      }
                    })
                    .finally(() => setLoading(false))
                }}
              >
                <RefreshCw className="text-foreground/80" aria-hidden />
                {tChat('refreshMessages')}
              </DropdownMenuItem>
              {conversation.platform === 'onlyfans' && (
                <>
                  <DropdownMenuSeparator />
                  <div
                    role="presentation"
                    className="mx-0.5 mb-1 flex items-center justify-between gap-3 rounded-xl border border-black/[0.04] bg-foreground/[0.03] px-3 py-3 dark:border-white/[0.06] dark:bg-white/[0.04]"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <span className="text-[14px] font-medium leading-snug tracking-[-0.012em] text-foreground">
                      {tChat('stayOnLatest')}
                    </span>
                    <Switch
                      checked={followThreadLatest}
                      onCheckedChange={(v) => persistFollowLatest(v)}
                      aria-label={tChat('scrollLatestAria')}
                    />
                  </div>
                  <p className="mx-0.5 mb-1 px-3 pb-2 text-[12px] leading-relaxed text-muted-foreground/90">
                    {tChat('stayOnLatestHelp')}
                  </p>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className={threadToolsMenuItemClass}
                    onClick={async () => {
                      const cid = String(conversation.chatId || conversation.user.id)
                      await fetch(`/api/onlyfans/chats/${encodeURIComponent(cid)}/read`, { method: 'POST' })
                    }}
                  >
                    <CheckCheck className="text-foreground/80" aria-hidden />
                    {tChat('markAsRead')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={threadToolsMenuItemClass}
                    onClick={async () => {
                      const cid = String(conversation.chatId || conversation.user.id)
                      await fetch(`/api/onlyfans/chats/${encodeURIComponent(cid)}/unread`, { method: 'POST' })
                    }}
                  >
                    <Mail className="text-foreground/80" aria-hidden />
                    {tChat('markAsUnread')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="mx-0.5 px-3 pb-2 pt-1">
                    <p className="text-[12px] font-semibold tracking-[-0.01em] text-foreground/95">
                      {tChat('markReadWhenOpening')}
                    </p>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground/88">
                      {tChat('markReadWhenOpeningHelp')}
                    </p>
                  </div>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault()
                      void setChatReadBehavior('inherit')
                    }}
                    className={cn(
                      threadToolsMenuItemClass,
                      'cursor-pointer',
                      onlyFansChatReadMode === 'inherit' && threadToolsMenuItemSelectedClass,
                    )}
                  >
                    <span className="flex w-full flex-col gap-1">
                      <span className="text-[14px] font-medium leading-snug tracking-[-0.012em]">
                        {tChat('accountDefault')}
                      </span>
                      <span className="text-[12px] leading-snug text-muted-foreground/90">
                        {tChat('messagingPrefLabel', {
                          state: messagingReadPrefs?.auto_mark_on_open
                            ? tChat('messagingPrefOn')
                            : tChat('messagingPrefOff'),
                        })}
                      </span>
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault()
                      void setChatReadBehavior('auto')
                    }}
                    className={cn(
                      threadToolsMenuItemClass,
                      'cursor-pointer',
                      onlyFansChatReadMode === 'auto' && threadToolsMenuItemSelectedClass,
                    )}
                  >
                    <span className="text-[14px] font-medium tracking-[-0.012em]">{tChat('alwaysThisThread')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault()
                      void setChatReadBehavior('never')
                    }}
                    className={cn(
                      threadToolsMenuItemClass,
                      'cursor-pointer',
                      onlyFansChatReadMode === 'never' && threadToolsMenuItemSelectedClass,
                    )}
                  >
                    <span className="text-[14px] font-medium tracking-[-0.012em]">{tChat('neverThisThread')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    className={cn(
                      threadToolsMenuItemClass,
                      'text-destructive focus:bg-destructive/[0.08] focus:text-destructive data-[highlighted]:bg-destructive/[0.08] data-[highlighted]:text-destructive',
                      'dark:focus:bg-destructive/15 dark:data-[highlighted]:bg-destructive/15',
                    )}
                    onClick={() => setChatDeleteDialogOpen(true)}
                  >
                    <Trash2 aria-hidden />
                    {tChat('deleteChat')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      ) : null}

      {/* Scroll: thread + Divine AI — composer stays pinned below so send/input never clip */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={messagesContainerRef}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden"
        >
        <div
          className={cn(
            compactMobileChrome ? 'px-1.5 py-2 sm:px-3.5 sm:py-3.5' : 'p-3.5 sm:p-4',
          )}
        >
        {threadStaleReason ? (
          <div className="mb-2 rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {threadStaleReason}
          </div>
        ) : null}
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
                  setError(tChat('fanslyThreadViewUnavailable'))
                  return
                }
                setError(null)
                setLoading(true)
                fetch(`/api/onlyfans/messages/${conversation.user.id}?limit=100&refresh=1`)
                  .then(res => res.json())
                  .then((data: { messages?: OnlyFansMessage[]; source?: string; stale?: boolean }) => {
                    const normalized = normalizeAndSortMessages(data.messages || [])
                    setMessages(normalized)
                    lastGoodMessagesByConversationRef.current[
                      `${conversation.platform}:${String(conversation.user.id)}`
                    ] = normalized
                    if (data.stale === true || data.source === 'cache') {
                      setThreadStaleReason(tChat('threadStaleCached'))
                    } else {
                      setThreadStaleReason(null)
                    }
                  })
                  .catch((e) =>
                    setError(e instanceof Error ? e.message : tChat('errorRefreshThread')),
                  )
                  .finally(() => setLoading(false))
              }}
            >
              {tChat('tryAgain')}
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center text-center sm:min-h-[240px]">
            <p className="text-sm text-muted-foreground">{tChat('noMessagesYet')}</p>
            <p className="text-xs text-muted-foreground">{tChat('startConversation')}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((msg) => {
              const fromId = msg.fromUser?.id
              const isCreator =
                typeof msg.isSentByMe === 'boolean'
                  ? msg.isSentByMe
                  : String(fromId ?? '') !== String(conversation.user.id)
              const mid = String(msg.id)
              const sendSource = isCreator ? resolveDmSendSource(dmSendSourceByMessageId, mid) : 'user'
              const isAiAssisted = isCreator && sendSource !== 'user'
              const creatorStyles = isCreator ? creatorBubbleStyles(sendSource, tChat) : null
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
                      compactMobileChrome
                        ? 'max-w-[min(92vw,100%)] sm:max-w-[96%] md:max-w-[90%]'
                        : 'max-w-[96%] md:max-w-[90%]',
                      'rounded-2xl px-4 py-2',
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
                          'text-[13px] leading-relaxed whitespace-pre-wrap',
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
                            ? tChat('fanDeletedOnPlatformNote')
                            : tChat('removedOnPlatformNote')}
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
                              if (!window.confirm(tChat('confirmRemoveSavedCopy'))) return
                              setPurgingCacheIds((prev) => new Set(prev).add(mid))
                              void fetch(
                                `/api/onlyfans/messages/${encodeURIComponent(String(conversation.user.id))}/cache/${encodeURIComponent(mid)}`,
                                { method: 'DELETE', credentials: 'include' },
                              )
                                .then(async (res) => {
                                  if (!res.ok) {
                                    const j = await res.json().catch(() => ({}))
                                    throw new Error(
                                      typeof j.error === 'string' ? j.error : tChat('errorCouldNotRemoveSaved'),
                                    )
                                  }
                                  setMessages((prev) => prev.filter((m) => String(m.id) !== mid))
                                })
                                .catch((err) => {
                                  setError(
                                    err instanceof Error ? err.message : tChat('errorCouldNotRemoveSaved'),
                                  )
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
                            {tChat('removeSavedCopyButton')}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                    {msg.price != null && Number(msg.price) > 0 && !msg.isPaid && (
                      <Badge className="mt-2 bg-chart-4/20 text-chart-4">
                        <DollarSign className="mr-1 h-3 w-3" />
                        {tChat('ppvWithPrice', { price: `$${msg.price}` })}
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
              padComposerForDivineFab
                ? 'bottom-3 right-[5.25rem] sm:right-[5.75rem]'
                : 'bottom-3 right-3',
            )}
            aria-label={tChat('scrollToLatestMessages')}
            title={tChat('scrollToLatestMessages')}
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
            <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-2 py-1.5 sm:px-3">
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto min-h-9 min-w-0 flex-1 justify-start gap-2 px-2 py-1.5 text-left text-xs font-medium sm:h-9 sm:py-0 sm:flex-none"
                >
                  {aiSectionOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
                  )}
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="flex min-w-0 flex-col items-start gap-0">
                    <span className="truncate">{tChat('divineAiCollapsibleTitle')}</span>
                    <span className="text-[10px] font-normal leading-snug text-muted-foreground md:hidden">
                      {tChat('divineAiCollapsibleSubtitleMobile')}
                    </span>
                  </span>
                </Button>
              </CollapsibleTrigger>
              <span className="hidden shrink-0 text-[10px] text-muted-foreground md:inline">
                {tChat('notSentToFan')}
              </span>
              <Badge
                variant="outline"
                className="hidden shrink-0 gap-1 border-amber-500/30 bg-amber-500/[0.08] text-[10px] sm:inline-flex"
                {...DASHBOARD_CREDIT_SUMMARY_MARK}
              >
                <Sparkles className="h-3 w-3 text-amber-500" />
                {creditSnapshot
                  ? tChat('aiCreditsRemaining', { count: creditSnapshot.totalRemaining })
                  : tChat('aiCreditsLabel')}
              </Badge>
            </div>
            <CollapsibleContent>
              <div className="space-y-2 overflow-y-auto bg-muted/15 px-3 py-2 pb-3 sm:px-4 sm:py-3">
              <p className="text-[10px] leading-snug text-muted-foreground/90">{tChat('creditRunBlurb')}</p>
              {scanInsights && (
                <div className="space-y-1 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 font-medium text-primary">
                      <Sparkles className="h-3 w-3" />
                      {tChat('threadScanInsightsTitle')}
                    </div>
                    <button
                      type="button"
                      className="text-[10px] text-primary/70 hover:underline"
                      onClick={() => setScanInsights(null)}
                    >
                      {tChat('clearScanInsights')}
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
                      {tChat('scanRisksLine', {
                        flags: scanInsights.riskFlags.slice(0, 3).join('; '),
                      })}
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
                  {tChat('btnScan')}
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
                  {tChat('btnCirce')}
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
                  {tChat('btnVenus')}
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
                  {tChat('btnFlirt')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 border-sky-500/50 text-xs text-sky-500"
                  disabled={suggestionsLoading === 'mimic' || messages.length === 0 || !isOnlyFansConversation}
                  onClick={() => callSuggestionApi('mimic')}
                  title={
                    isOnlyFansConversation
                      ? tChat('mimicTooltipOnlyfans')
                      : tChat('mimicTooltipUnavailable')
                  }
                >
                  {suggestionsLoading === 'mimic' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {tChat('btnMimic')}
                  <Badge className="ml-1 border border-sky-400/40 bg-sky-500/20 px-1.5 py-0 text-[9px] uppercase tracking-wide text-sky-100">
                    {tChat('mimicBetaBadge')}
                  </Badge>
                </Button>
              </div>

              {(activePanel === 'circe' && circeSuggestions) ||
              (activePanel === 'venus' && venusSuggestions) ||
              (activePanel === 'flirt' && flirtSuggestions) ||
              (activePanel === 'mimic' && mimicSuggestions) ? (
                <div className="space-y-2 rounded-md border border-border bg-secondary/40 p-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">
                      {activePanel === 'circe'
                        ? tChat('suggestionsHeadingCirce')
                        : activePanel === 'venus'
                          ? tChat('suggestionsHeadingVenus')
                          : activePanel === 'flirt'
                            ? tChat('suggestionsHeadingFlirt')
                            : tChat('suggestionsHeadingMimic')}
                    </span>
                    <button
                      type="button"
                      className="text-[10px] text-muted-foreground hover:underline"
                      onClick={() => setActivePanel(null)}
                    >
                      {tChat('closePanel')}
                    </button>
                  </div>
                  <div className="space-y-1">
                    {(activePanel === 'circe'
                      ? circeSuggestions
                      : activePanel === 'venus'
                        ? venusSuggestions
                        : activePanel === 'flirt'
                          ? flirtSuggestions
                          : mimicSuggestions
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
                            if (panel === 'circe' || panel === 'venus' || panel === 'flirt' || panel === 'mimic') {
                              pendingComposerSuggestionRef.current = panel
                            }
                            void applyComposerTextAnimated(text, true, { skipAnimation: false })
                          }}
                        >
                          {text}
                        </button>
                      ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{tChat('suggestionsTapHint')}</p>
                </div>
              ) : null}

              <p className="text-[10px] leading-snug text-muted-foreground/90">{tChat('fanVisibleThreadNote')}</p>
            </div>
            </CollapsibleContent>
          </Collapsible>
          {isOnlyFansConversation ? (
            <div className="border-t border-border/50 px-2 py-1 sm:px-3">
              <div className="flex min-h-0 items-center gap-2 rounded-md border border-border/35 bg-muted/10 px-2 py-1">
                <Shield className="h-3.5 w-3.5 shrink-0 text-violet-400" aria-hidden />
                <p className="min-w-0 flex-1 truncate text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
                  <span className="font-medium text-foreground/90">{tChat('ariadneTeaserTitle')}</span>
                  <span className="text-muted-foreground/90"> · {tChat('ariadneTeaserLine')}</span>
                </p>
                <Badge
                  variant="outline"
                  className="shrink-0 border-violet-500/35 bg-violet-500/[0.12] px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide text-violet-100/90"
                >
                  {tChat('ariadneTeaserBadge')}
                </Badge>
                <Button asChild size="sm" variant="secondary" className="h-7 shrink-0 px-2.5 text-[11px]">
                  <Link href="/dashboard/ai-studio/ariadne" prefetch={false}>
                    {tChat('ariadneTeaserCta')}
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}
        </div>

      {/* Composer + send: fixed to bottom of chat card (always visible) */}
      <div className="flex flex-shrink-0 flex-col border-t border-border/80 bg-card shadow-[0_-6px_20px_rgba(0,0,0,0.12)] dark:shadow-[0_-6px_24px_rgba(0,0,0,0.45)]">
        {error && messages.length > 0 && (
          <div className="border-b border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive sm:px-4">
            {error}
          </div>
        )}

        <div
          className={cn(
            'space-y-2.5 px-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 sm:px-4 sm:pb-3',
            padComposerForDivineFab && 'pb-1 pr-[5rem] sm:pr-[6rem]',
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
                  {tChat('attachmentCount', { count: attachedMediaIds.length })}
                </span>
              )}
              {ppvPrice && (
                <Badge className="bg-chart-4/20 text-chart-4">
                  <DollarSign className="mr-1 h-3 w-3" />
                  {tChat('ppvWithPrice', { price: `$${ppvPrice}` })}
                </Badge>
              )}
            </div>
          )}

          {isMobile ? (
            <>
              <div className="flex min-w-0 items-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  disabled={!isOnlyFansConversation || uploadingMedia}
                  onClick={() => chatFileInputRef.current?.click()}
                  title={
                    isOnlyFansConversation ? tChat('attachMediaTooltipOf') : tChat('attachMediaTooltipNotOf')
                  }
                >
                  {uploadingMedia ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
                </Button>

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
                          <span className="tracking-tight">{tChat('divineIsTyping')}</span>
                        </>
                      ) : (
                        <span className="tracking-tight tabular-nums text-violet-200/95 dark:text-violet-300/90">
                          {tChat('sendingInSeconds', { seconds: divineScheduleSeconds ?? 0 })}
                        </span>
                      )}
                    </div>
                  )}
                  <Textarea
                    placeholder={tChat('messagePlaceholderMobile')}
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
                      'max-h-[min(28dvh,220px)] min-h-[44px] resize-none rounded-xl bg-input pr-3 text-sm leading-relaxed',
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

              <div className="flex gap-1.5 overflow-x-auto border-t border-border/25 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 shrink-0 gap-1 px-2.5"
                      disabled={!isOnlyFansConversation}
                    >
                      <DollarSign className="h-3.5 w-3.5" />
                      {ppvPrice
                        ? tChat('ppvWithPrice', { price: `$${ppvPrice}` })
                        : tChat('ppvInputShortPlaceholder')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3" align="start">
                    <Label className="text-xs">{tChat('ppvPriceLabel')}</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={ppvPrice}
                      onChange={(e) => setPpvPrice(e.target.value)}
                      className="mt-2 h-9"
                      placeholder={tChat('placeholderZero')}
                    />
                  </PopoverContent>
                </Popover>
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
                  variant="outline"
                  className="h-9 shrink-0 px-3"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 gap-1 px-2.5"
                  title={tChat('divineOperatorSheetTitle')}
                  onClick={() => setMobileDivineOperatorSheetOpen(true)}
                >
                  <SidebarDivineManagerCrown
                    iconBoxClass="h-3.5 w-3.5"
                    gradientSlot="composer-tray-mobile"
                  />
                  <span className="text-[11px] font-medium">{tChat('toolbarDivine')}</span>
                </Button>
              </div>
            </>
          ) : (
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
                    isOnlyFansConversation ? tChat('attachMediaTooltipOf') : tChat('attachMediaTooltipNotOf')
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
                    placeholder={tChat('ppvInputShortPlaceholder')}
                    value={ppvPrice}
                    onChange={(e) => setPpvPrice(e.target.value)}
                    className="h-8 w-[3.25rem] px-1.5 text-xs"
                    title={tChat('optionalPpvPriceTitle')}
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
                        <span className="tracking-tight">{tChat('divineIsTyping')}</span>
                      </>
                    ) : (
                      <span className="tracking-tight tabular-nums text-violet-200/95 dark:text-violet-300/90">
                        {tChat('sendingInSeconds', { seconds: divineScheduleSeconds ?? 0 })}
                      </span>
                    )}
                  </div>
                )}
                <Textarea
                  placeholder={tChat('messagePlaceholderDesktop')}
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
                    'min-h-[80px] resize-y rounded-xl bg-input pr-11 text-sm leading-relaxed sm:pr-12 sm:text-sm',
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
          )}

          <p className="hidden text-[10px] text-muted-foreground sm:block">
            {tChat('composerPpvHintDesktop')}
          </p>
          <p className="text-[10px] text-muted-foreground sm:hidden">
            {tChat('composerPpvHintMobile')}
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

      {isMobile ? (
        <Sheet open={mobileDivineOperatorSheetOpen} onOpenChange={setMobileDivineOperatorSheetOpen}>
          <SheetContent
            side="bottom"
            className="max-h-[min(72dvh,520px)] gap-0 overflow-hidden rounded-t-2xl border-t p-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] [&>button]:top-3"
          >
            <SheetHeader className="border-b border-border/60 px-4 pb-3 pt-1 text-left">
              <SheetTitle className="text-base">{tChat('divineOperatorSheetTitle')}</SheetTitle>
              <SheetDescription className="text-xs">{tChat('divineOperatorSheetSubtitle')}</SheetDescription>
            </SheetHeader>
            <div className="max-h-[min(58dvh,440px)] overflow-y-auto">
              <div className="flex flex-col py-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 shrink-0 justify-start gap-3 rounded-none px-4 text-sm font-normal"
                  onClick={() => {
                    setMobileDivineOperatorSheetOpen(false)
                    setAiSectionOpen(true)
                  }}
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {tChat('divineOpSmartReplies')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 shrink-0 justify-start gap-3 rounded-none px-4 text-sm font-normal"
                  disabled={!isOnlyFansConversation || messages.length === 0}
                  onClick={() => {
                    setMobileDivineOperatorSheetOpen(false)
                    setAiSectionOpen(true)
                    void callSuggestionApi('mimic')
                  }}
                >
                  <PenLine className="h-4 w-4 shrink-0 text-sky-500" aria-hidden />
                  {tChat('divineOpRewrite')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 shrink-0 justify-start gap-3 rounded-none px-4 text-sm font-normal"
                  disabled={!isOnlyFansConversation || messages.length === 0}
                  onClick={() => {
                    setMobileDivineOperatorSheetOpen(false)
                    setAiSectionOpen(true)
                    void callSuggestionApi('flirt')
                  }}
                >
                  <Heart className="h-4 w-4 shrink-0 text-pink-500" aria-hidden />
                  {tChat('divineOpFlirt')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 shrink-0 justify-start gap-3 rounded-none px-4 text-sm font-normal"
                  disabled={!isOnlyFansConversation || messages.length === 0}
                  onClick={() => {
                    setMobileDivineOperatorSheetOpen(false)
                    setAiSectionOpen(true)
                    void callSuggestionApi('venus')
                  }}
                >
                  <TrendingUp className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                  {tChat('divineOpUpsell')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 shrink-0 justify-start gap-3 rounded-none px-4 text-sm font-normal"
                  disabled={!isOnlyFansConversation || messages.length === 0}
                  onClick={() => {
                    setMobileDivineOperatorSheetOpen(false)
                    setAiSectionOpen(true)
                    void callSuggestionApi('circe')
                  }}
                >
                  <RefreshCw className="h-4 w-4 shrink-0 text-violet-400" aria-hidden />
                  {tChat('divineOpRevive')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 shrink-0 justify-start gap-3 rounded-none px-4 text-sm font-normal"
                  disabled={!isOnlyFansConversation || messages.length === 0}
                  onClick={() => {
                    setMobileDivineOperatorSheetOpen(false)
                    setAiSectionOpen(true)
                    void callSuggestionApi('scan')
                  }}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-orange-400" aria-hidden />
                  {tChat('divineOpObjection')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 shrink-0 justify-start gap-3 rounded-none px-4 text-sm font-normal"
                  onClick={() => {
                    setMobileDivineOperatorSheetOpen(false)
                    openDivineVoiceLauncher()
                  }}
                >
                  <Mic className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  {tChat('divineOpVoiceSession')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 shrink-0 justify-start gap-3 rounded-none px-4 text-sm font-normal"
                  asChild
                >
                  <Link
                    href="/dashboard/divine-manager"
                    prefetch={false}
                    onClick={() => setMobileDivineOperatorSheetOpen(false)}
                    className="inline-flex w-full items-center gap-3"
                  >
                    <MessageSquarePlus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    {tChat('divineOpCustomPrompt')}
                  </Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ) : null}

      <AlertDialog open={chatDeleteDialogOpen} onOpenChange={setChatDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{tChat('deleteChatConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{tChat('deleteChatConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              type="button"
              disabled={chatDeleteBusy}
              onClick={() => setChatDeleteDialogOpen(false)}
            >
              {tChat('dialogCancel')}
            </Button>
            <Button
              variant="destructive"
              type="button"
              disabled={chatDeleteBusy}
              className="gap-2"
              onClick={() => void confirmDeleteOnlyFansChat()}
            >
              {chatDeleteBusy ? <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden /> : null}
              {tChat('deleteChat')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
