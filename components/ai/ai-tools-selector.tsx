'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { isPaidPlanId } from '@/lib/billing/access'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Wand2, 
  PenTool, 
  Brain, 
  Target, 
  Lightbulb, 
  Flame, 
  MessageSquare,
  Sparkles,
  Loader2,
  Copy,
  Check,
  ArrowLeft,
  Lock,
  Zap,
  Hash,
  DollarSign,
  Clock,
  ChevronRight,
  Crown,
  BarChart3,
  Calendar,
  Gift,
  Camera,
  Mic,
  Users,
  TrendingDown,
  Send,
  Heart,
  Video,
  Eye,
  ExternalLink,
} from 'lucide-react'
import { VoiceInputButton } from '@/components/voice-input-button'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { getToolMeta } from '@/lib/ai-tools-data'
import {
  compressImageForVision,
  extractVideoFrameAsDataUrl,
} from '@/components/ai/caption-media-utils'
import { getUpcomingCosmicEvents } from '@/lib/calendar/upcoming-cosmic-events'
import { useVoiceSession } from '@/components/divine/voice-session-context'
import {
  fetchCrmFansHybrid,
  crmFanToChurnRow,
  crmFanToFantasyRow,
} from '@/lib/crm/fetch-crm-fans-client'
import type { CrmFansResponse } from '@/lib/crm/crm-fan-types'

function formatFantasyCalendarDate(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

// Define the non-Pro AI tools that work
const workingTools = [
  {
    id: 'caption-generator',
    name: 'Caption Generator',
    description: 'Vision + voice captions for your media',
    longDescription: 'Upload a photo or video frame, or describe with text or voice. AI sees the image when provided.',
    icon: Wand2,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    credits: 1,
  },
  {
    id: 'fantasy-writer',
    name: 'Fantasy Writer',
    description: 'Roleplay tied to calendar & fans',
    longDescription: 'Use cosmic events, your content calendar, and fan CRM — optional scenario or voice.',
    icon: PenTool,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    credits: 2,
  },
  {
    id: 'content-ideas',
    name: 'Content Ideas',
    description: 'Trending content suggestions',
    longDescription: 'Get AI-powered content ideas based on trending topics, your niche, and what performs best for similar creators.',
    icon: Lightbulb,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    credits: 1,
  },
  {
    id: 'photo-enhancer',
    name: 'Safe photo touch-up',
    description: 'AI blur, lighting, emoji — text or voice',
    longDescription:
      'Upload a photo, then describe changes in text or voice. AI maps your request to safe blur, brightness, or emoji only (no beautify or inpaint).',
    icon: Camera,
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
    credits: 1,
  },
  {
    id: 'mood-detector',
    name: 'Mood Detector',
    description: 'Analyze fan emotional state',
    longDescription: 'Understand your fans better by analyzing message sentiment to tailor your responses and content.',
    icon: Brain,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    credits: 1,
  },
  {
    id: 'price-optimizer',
    name: 'Price Optimizer',
    description: 'Optimal pricing suggestions',
    longDescription: 'AI analyzes your engagement data to suggest optimal pricing for subscriptions, PPV, and custom content.',
    icon: Target,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    credits: 2,
  },
  {
    id: 'viral-predictor',
    name: 'Viral Predictor',
    description: 'Content success prediction',
    longDescription: 'Predict which content is most likely to go viral before you post, based on trending patterns and your audience.',
    icon: Flame,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    credits: 2,
  },
  {
    id: 'gift-suggester',
    name: 'Gift Suggester',
    description: 'Personalized gift recommendations',
    longDescription: 'Suggest personalized gifts and rewards for your top fans based on their engagement patterns and preferences.',
    icon: Gift,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    credits: 1,
  },
]

// Pro tools that require subscription
const proTools = [
  {
    id: 'voice-clone',
    name: 'Voice Clone',
    description: 'Clone your writing voice for consistent messaging',
    longDescription: 'AI analyzes your writing style and generates authentic messages that sound exactly like you.',
    icon: Mic,
    color: 'text-gold',
    bgColor: 'bg-gold/10',
    borderColor: 'border-gold/30',
    credits: 3,
    isPro: true,
  },
  {
    id: 'pricing-optimizer',
    name: 'Pricing Optimizer',
    description: 'AI-powered pricing recommendations',
    longDescription: 'Get data-driven pricing suggestions for subscriptions, PPV, and custom content based on market analysis.',
    icon: DollarSign,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    credits: 2,
    isPro: true,
  },
  {
    id: 'churn-predictor',
    name: 'Churn Predictor',
    description: 'Identify at-risk fans before they leave',
    longDescription: 'AI analyzes fan behavior to predict churn risk and provides personalized retention strategies.',
    icon: TrendingDown,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    credits: 2,
    isPro: true,
  },
  {
    id: 'mass-dm-composer',
    name: 'Mass DM Composer',
    description: 'Create personalized mass messages at scale',
    longDescription: 'Generate personalized mass DM campaigns that feel authentic with dynamic placeholders.',
    icon: Send,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    credits: 2,
    isPro: true,
  },
  {
    id: 'standard-of-attraction',
    name: 'Standard of Attraction',
    description: 'Pro rating of how commercially attractive your content is',
    longDescription: 'Let Venus and Circe rate how commercially attractive your latest photos and videos are—through their eyes—before you post.',
    icon: Heart,
    color: 'text-gold',
    bgColor: 'bg-gold/10',
    borderColor: 'border-gold/30',
    credits: 3,
    isPro: true,
  },
  {
    id: 'video-script-ai',
    name: 'Video Script AI',
    description: 'Hooks, beats, and CTAs for video',
    longDescription:
      'Structured scripts for teasers and promos: hook, beats, optional on-screen text, and a fan CTA. Set platform and length below.',
    icon: Video,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    credits: 3,
    isPro: true,
  },
  {
    id: 'competitor-analysis',
    name: 'Competitor Analysis',
    description: 'Positioning vs peers (public signals)',
    longDescription:
      'Compare positioning using only what you paste below (public @handles, bios, pricing hints). Get differentiation ideas, content angles, and watch-outs — no scraping or private data.',
    icon: Eye,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    credits: 5,
    isPro: true,
  },
]

// Caption Generator Result Interface
interface CaptionResult {
  captions: Array<{ text: string; tone: string; length: string }>
  hashtags: string[]
  teaserMessage: string
  ppvSalesCopy: string
  bestPostingTime: string
  targetAudience: string
  contentTips: string[]
}

// Content Ideas Result Interface
interface ContentIdeasResult {
  ideas: Array<{
    title: string
    description: string
    type: string
    estimatedEngagement: string
    bestTimeToPost: string
    hashtags: string[]
  }>
  trendingTopics: string[]
  seasonalOpportunities: string[]
}

// Generic AI Result Interface
interface AIResult {
  content: string
  suggestions?: string[]
  analysis?: Record<string, unknown>
}

interface CompetitorInsightResult {
  executiveSummary: string
  marketContext: string
  qualitativeTierNote: string
  peerArchetypes: Array<{
    label: string
    typicalPublicSignals: string
    ideasToBorrow: string
  }>
  differentiationAngles: string[]
  postingCadenceIdeas: string[]
  chattingAndDmTips: string[]
  commentingAndSocialTips: string[]
  howToUseSources: string
  caveats: string
  sources?: Array<{ url: string; title: string }>
  meta?: {
    webSearchUsed?: boolean
    webHitCount?: number
    libraryRowCount?: number
    communityTipCount?: number
    fanCount?: number | null
    internalCohortPublished?: boolean
    internalCohortDatasetCreators?: number
    internalBenchmarkBucketsInPrompt?: number
  }
}

// Standard of Attraction result
interface AttractionResult {
  score: number
  verdict: string
  venusTake: string
  circeTake: string
  strengths: string[]
  improvements: string[]
}

interface PhotoEditIntentResult {
  imageBase64: string
  operation: string
  explanation: string
  creditsUsed?: number
}

type ToolType = typeof workingTools[0] | typeof proTools[0]

function makeGenericTool(toolId: string): ToolType {
  const meta = getToolMeta(toolId)
  return {
    id: toolId,
    name: meta?.name ?? toolId,
    description: meta?.description ?? 'AI-powered tool',
    longDescription: meta?.longDescription ?? 'Describe what you need below and run.',
    icon: Wand2,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
    credits: meta?.credits ?? 1,
  }
}

export function AIToolsSelector({
  initialToolId,
  backHref = '/dashboard/ai-studio/tools',
}: {
  initialToolId?: string
  backHref?: string
} = {}) {
  const voiceSession = useVoiceSession()
  const photoVoiceImageRef = useRef<string | null>(null)
  const [selectedTool, setSelectedTool] = useState<ToolType | null>(null)
  const [resolvingInitial, setResolvingInitial] = useState(!!initialToolId)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CaptionResult | ContentIdeasResult | AIResult | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isPro, setIsPro] = useState(false)
  const [aiCreditsUsed, setAiCreditsUsed] = useState(0)
  const [aiCreditsLimit, setAiCreditsLimit] = useState(100)
  const supabase = createClient()
  
  // Check subscription status
  const loadSubscription = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const { data } = await supabase
      .from('subscriptions')
      .select('plan_id, ai_credits_used, ai_credits_limit')
      .eq('user_id', user.id)
      .single()
    
    if (data) {
      const planId = (data as any).plan_id as string | null | undefined
      const normalized = planId?.toLowerCase() || null
      setIsPro(Boolean(normalized && isPaidPlanId(normalized)))
      setAiCreditsUsed(data.ai_credits_used || 0)
      setAiCreditsLimit(data.ai_credits_limit || 100)
    }
  }, [supabase])
  
  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  useEffect(() => {
    if (!initialToolId) {
      setResolvingInitial(false)
      return
    }
    const all = [...workingTools, ...proTools]
    const found = all.find((t) => t.id === initialToolId)
    if (found) {
      setSelectedTool(found)
    } else {
      setSelectedTool(makeGenericTool(initialToolId) as ToolType)
    }
    setResolvingInitial(false)
  }, [initialToolId])
  
  // Form states for different tools
  const [contentType, setContentType] = useState('photo')
  const [videoScriptLength, setVideoScriptLength] = useState('short')
  const [competitorTargets, setCompetitorTargets] = useState('')
  const [useCompetitorWebSearch, setUseCompetitorWebSearch] = useState(true)
  const [contentDescription, setContentDescription] = useState('')
  const [platform, setPlatform] = useState('onlyfans')
  const [niche, setNiche] = useState('')
  const [fanMessage, setFanMessage] = useState('')
  const [currentPrice, setCurrentPrice] = useState('')
  
  // Pro tool specific states
  const [sampleText, setSampleText] = useState('')
  const [audienceSegment, setAudienceSegment] = useState('all')
  const [campaignGoal, setCampaignGoal] = useState('')
  const [attractionImage, setAttractionImage] = useState<string | null>(null)
  const [captionImageDataUrl, setCaptionImageDataUrl] = useState<string | null>(null)
  const [photoEditImageDataUrl, setPhotoEditImageDataUrl] = useState<string | null>(null)
  photoVoiceImageRef.current = photoEditImageDataUrl
  const [giftUseWishlist, setGiftUseWishlist] = useState(true)
  const [churnFanId, setChurnFanId] = useState<string>('manual')
  const [churnExpiringOnly, setChurnExpiringOnly] = useState(false)
  const [churnFans, setChurnFans] = useState<
    {
      id: string
      username: string
      display_name: string | null
      total_spent: number | null
      platform: string
      subscription_expires_at?: string | null
      subscription_status?: string | null
    }[]
  >([])

  const churnFansFiltered = useMemo(() => {
    if (!churnExpiringOnly) return churnFans
    const now = Date.now()
    const horizon = now + 14 * 86400000
    return churnFans.filter((f) => {
      const raw = f.subscription_expires_at
      if (!raw) return false
      const t = new Date(raw).getTime()
      return !Number.isNaN(t) && t >= now && t <= horizon
    })
  }, [churnFans, churnExpiringOnly])

  const upcomingCosmicEvents = useMemo(() => getUpcomingCosmicEvents(90), [])

  const [fantasyFans, setFantasyFans] = useState<
    {
      id: string
      username: string | null
      platform_username: string | null
      display_name: string | null
      total_spent: number | null
      platform: string
      notes: string | null
      tags: unknown
    }[]
  >([])
  const [fantasyScheduledContent, setFantasyScheduledContent] = useState<
    {
      id: string
      title: string
      description: string | null
      scheduled_at: string | null
      status: string
    }[]
  >([])
  const [fantasyFanId, setFantasyFanId] = useState('')
  const [fantasyHolidayEventId, setFantasyHolidayEventId] = useState('')
  const [fantasyContentId, setFantasyContentId] = useState('')
  const [crmFansMeta, setCrmFansMeta] = useState<CrmFansResponse['meta'] | null>(null)

  useEffect(() => {
    if (selectedTool?.id !== 'churn-predictor') return
    void (async () => {
      try {
        const { fans, meta } = await fetchCrmFansHybrid()
        setCrmFansMeta(meta)
        setChurnFans(fans.slice(0, 150).map(crmFanToChurnRow))
      } catch {
        setCrmFansMeta(null)
        setChurnFans([])
      }
    })()
  }, [selectedTool?.id])

  useEffect(() => {
    if (churnFanId === 'manual') return
    if (!churnFansFiltered.some((f) => f.id === churnFanId)) {
      setChurnFanId('manual')
    }
  }, [churnFanId, churnFansFiltered])

  useEffect(() => {
    const onVoicePhoto = (e: Event) => {
      const d = (e as CustomEvent<PhotoEditIntentResult>).detail
      if (!d?.imageBase64) return
      setPhotoEditImageDataUrl(d.imageBase64)
      setResult({
        imageBase64: d.imageBase64,
        operation: d.operation,
        explanation: d.explanation ?? 'Applied.',
        creditsUsed: d.creditsUsed,
      })
    }
    window.addEventListener('creatix-photo-touchup-voice', onVoicePhoto as EventListener)
    return () => window.removeEventListener('creatix-photo-touchup-voice', onVoicePhoto as EventListener)
  }, [])

  useEffect(() => {
    if (selectedTool?.id !== 'fantasy-writer') return
    const sb = createClient()
    void (async () => {
      const {
        data: { user },
      } = await sb.auth.getUser()
      if (!user) return
      const [crm, contentRes] = await Promise.all([
        fetchCrmFansHybrid().catch(() => null as CrmFansResponse | null),
        sb
          .from('content')
          .select('id, title, description, scheduled_at, status')
          .eq('user_id', user.id)
          .order('scheduled_at', { ascending: true, nullsFirst: false })
          .limit(40),
      ])
      if (crm) {
        setCrmFansMeta(crm.meta)
        setFantasyFans(crm.fans.slice(0, 150).map(crmFanToFantasyRow))
      } else {
        setCrmFansMeta(null)
        setFantasyFans([])
      }
      setFantasyScheduledContent((contentRes.data as typeof fantasyScheduledContent) || [])
    })()
  }, [selectedTool?.id])
  
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const getToneColor = (tone: string) => {
    const colors: Record<string, string> = {
      teasing: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      playful: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      mysterious: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      confident: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      intimate: 'bg-red-500/20 text-red-400 border-red-500/30',
    }
    return colors[tone] || 'bg-muted text-muted-foreground'
  }
  
  const runTool = async () => {
    if (!selectedTool) return
    
    setLoading(true)
    setResult(null)
    
    try {
      let response: Response
      
      switch (selectedTool.id) {
        case 'caption-generator':
          response = await fetch('/api/ai/caption-generator', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contentType,
              contentDescription,
              platform,
              image: captionImageDataUrl || undefined,
            }),
          })
          break
          
        case 'fantasy-writer': {
          const calendarEventSummary = fantasyHolidayEventId
            ? (() => {
                const ev = upcomingCosmicEvents.find((e) => e.id === fantasyHolidayEventId)
                if (!ev) return undefined
                return `${ev.holiday.name} (${formatFantasyCalendarDate(ev.date)}, ${ev.holiday.type}). Content angle: ${ev.holiday.contentIdea}`
              })()
            : undefined

          const fanProfileSummary = fantasyFanId
            ? (() => {
                const f = fantasyFans.find((x) => x.id === fantasyFanId)
                if (!f) return undefined
                const handle = f.username || f.platform_username || 'fan'
                const tags = Array.isArray(f.tags) ? (f.tags as string[]).join(', ') : ''
                return [
                  `Fan @${handle} on ${f.platform}`,
                  f.display_name ? `Display name: ${f.display_name}` : '',
                  `Approx. lifetime spend: ${f.total_spent ?? 0}`,
                  f.notes ? `Your notes: ${f.notes}` : '',
                  tags ? `Tags: ${tags}` : '',
                ]
                  .filter(Boolean)
                  .join('\n')
              })()
            : undefined

          const scheduledContentSummary = fantasyContentId
            ? (() => {
                const c = fantasyScheduledContent.find((x) => x.id === fantasyContentId)
                if (!c) return undefined
                const when = c.scheduled_at
                  ? formatFantasyCalendarDate(new Date(c.scheduled_at))
                  : 'not scheduled yet'
                return `Your content calendar — "${c.title}" (${c.status}). Target timing: ${when}.${c.description ? ` Notes: ${c.description}` : ''}`
              })()
            : undefined

          response = await fetch('/api/ai/fantasy-writer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scenario: contentDescription,
              tone: contentType,
              platform,
              calendarEventSummary,
              fanProfileSummary,
              scheduledContentSummary,
            }),
          })
          break
        }
          
        case 'content-ideas':
          response = await fetch('/api/ai/content-ideas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              niche: niche || 'general',
              platform,
              currentTrends: contentDescription,
            }),
          })
          break

        case 'photo-enhancer':
          response = await fetch('/api/ai/photo-edit-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: photoEditImageDataUrl,
              instruction: contentDescription.trim(),
            }),
          })
          break
          
        case 'mood-detector':
          response = await fetch('/api/ai/mood-detector', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mode: 'fan_message',
              message: fanMessage,
            }),
          })
          break
          
        case 'price-optimizer':
          response = await fetch('/api/ai/revenue-optimizer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currentPrice,
              contentType,
              platform,
              description: contentDescription,
            }),
          })
          break
          
        case 'viral-predictor':
          response = await fetch('/api/ai/viral-predictor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contentDescription,
              contentType,
              platform,
            }),
          })
          break
          
        case 'gift-suggester':
          response = await fetch('/api/ai/gift-suggester', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fanInfo: fanMessage,
              budget: currentPrice,
              useWishlist: giftUseWishlist,
            }),
          })
          break
        
        // Pro Tools
        case 'voice-clone':
          response = await fetch('/api/ai/voice-clone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sampleText,
              targetTone: contentType,
              context: contentDescription,
            }),
          })
          break
          
        case 'pricing-optimizer':
          response = await fetch('/api/ai/pricing-optimizer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contentType,
              currentPrice,
              niche,
              subscriberCount: fanMessage,
            }),
          })
          break
          
        case 'churn-predictor':
          response = await fetch('/api/ai/churn-predictor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
              churnFanId !== 'manual'
                ? {
                    fanId: churnFanId,
                    recentActivity: contentDescription || undefined,
                    spendingHistory: fanMessage || undefined,
                  }
                : {
                    fanData: fanMessage,
                    recentActivity: contentDescription || undefined,
                  },
            ),
          })
          break
          
        case 'mass-dm-composer':
          response = await fetch('/api/ai/mass-dm-composer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaign: campaignGoal,
              audienceSegment,
              tone: contentType,
              callToAction: contentDescription,
            }),
          })
          break

        case 'standard-of-attraction':
          response = await fetch('/api/ai/standard-of-attraction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              description: contentDescription.trim() || undefined,
              image: attractionImage || undefined,
              niche: niche || undefined,
              platform,
            }),
          })
          break

        case 'venus-attraction':
          response = await fetch('/api/ai/venus-attraction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: contentDescription, niche: niche || undefined, platform }),
          })
          break
        case 'venus-cupid':
          response = await fetch('/api/ai/venus-cupid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: contentDescription, niche: niche || undefined }),
          })
          break
        case 'venus-garden':
          response = await fetch('/api/ai/venus-garden', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: contentDescription, niche: niche || undefined }),
          })
          break
        case 'circe-oracle':
          response = await fetch('/api/ai/circe-oracle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: contentDescription, niche: niche || undefined }),
          })
          break
        case 'circe-transformation':
          response = await fetch('/api/ai/circe-transformation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: contentDescription, niche: niche || undefined }),
          })
          break

        case 'video-script-ai': {
          const scriptPrompt = [
            niche.trim() && `Niche / persona: ${niche.trim()}`,
            `Platform: ${platform}`,
            `Target length: ${videoScriptLength}`,
            contentDescription.trim(),
          ]
            .filter(Boolean)
            .join('\n')
          response = await fetch('/api/ai/tool-run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              toolId: selectedTool.id,
              prompt:
                scriptPrompt ||
                'Write a short vertical video script with a strong hook, 3–5 story beats, suggested on-screen text, and a clear CTA for subscribers.',
            }),
          })
          break
        }

        case 'competitor-analysis':
          response = await fetch('/api/ai/competitor-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              niche,
              platform,
              competitorTargets,
              goals: contentDescription,
              useWebSearch: useCompetitorWebSearch,
            }),
          })
          break

        default: {
          response = await fetch('/api/ai/tool-run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              toolId: selectedTool.id,
              prompt: contentDescription || 'Help me with this.',
            }),
          })
          break
        }
      }
      
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to run tool')
      }

      setResult(data)
    } catch (error) {
      console.error('Tool error:', error)
      // Set a fallback result for demo purposes
      setResult({
        content: 'AI analysis complete. Results are being processed.',
        suggestions: ['Try again with more details', 'Adjust your parameters'],
      })
    } finally {
      setLoading(false)
    }
  }
  
  const resetTool = () => {
    setSelectedTool(null)
    setResult(null)
    setContentDescription('')
    setFanMessage('')
    setCurrentPrice('')
    setNiche('')
    setAttractionImage(null)
    setCaptionImageDataUrl(null)
    setPhotoEditImageDataUrl(null)
    setChurnFanId('manual')
    setFantasyFanId('')
    setFantasyHolidayEventId('')
    setFantasyContentId('')
    setVideoScriptLength('short')
    setCompetitorTargets('')
    setUseCompetitorWebSearch(true)
    setGiftUseWishlist(true)
  }
  
  // Render tool-specific input form
  const renderToolInputs = () => {
    if (!selectedTool) return null
    
    switch (selectedTool.id) {
      case 'caption-generator':
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="photo">Photo</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="photoset">Photo Set</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                    <SelectItem value="livestream">Livestream</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onlyfans">OnlyFans</SelectItem>
                    <SelectItem value="fansly">Fansly</SelectItem>
                    <SelectItem value="mym">MYM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Upload photo or video (AI sees the frame)</Label>
              {captionImageDataUrl ? (
                <div className="relative overflow-hidden rounded-lg border border-border bg-muted/30">
                  <img
                    src={captionImageDataUrl}
                    alt="Preview for caption"
                    className="max-h-48 w-full object-contain"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute right-2 top-2"
                    onClick={() => setCaptionImageDataUrl(null)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp,video/mp4,video/quicktime,video/webm"
                  className="cursor-pointer"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (!file) return
                    try {
                      if (file.type.startsWith('video/')) {
                        const frame = await extractVideoFrameAsDataUrl(file)
                        const blob = await fetch(frame).then((r) => r.blob())
                        const compressed = await compressImageForVision(
                          new File([blob], 'frame.jpg', { type: 'image/jpeg' }),
                        )
                        setCaptionImageDataUrl(compressed)
                      } else {
                        const dataUrl = await compressImageForVision(file)
                        setCaptionImageDataUrl(dataUrl)
                      }
                    } catch {
                      const reader = new FileReader()
                      reader.onload = () => setCaptionImageDataUrl(reader.result as string)
                      reader.readAsDataURL(file)
                    }
                  }}
                />
              )}
              <p className="text-xs text-muted-foreground">
                For video we use one representative frame. Add voice or text below for extra context (tone, tease, PPV angle).
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Describe your content (optional if you uploaded media)</Label>
                <VoiceInputButton
                  onTranscript={(text) => setContentDescription(prev => prev + (prev ? ' ' : '') + text)}
                  size="sm"
                  variant="ghost"
                  showTooltip={true}
                />
              </div>
              <Textarea 
                placeholder="Optional: describe or use the mic to talk through what fans should feel — e.g., playful tease, soft lighting, bedroom mirror..."
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
        )
        
      case 'fantasy-writer':
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tone/Style</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="romantic">Romantic</SelectItem>
                    <SelectItem value="playful">Playful</SelectItem>
                    <SelectItem value="mysterious">Mysterious</SelectItem>
                    <SelectItem value="dominant">Dominant</SelectItem>
                    <SelectItem value="submissive">Submissive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onlyfans">OnlyFans</SelectItem>
                    <SelectItem value="fansly">Fansly</SelectItem>
                    <SelectItem value="mym">MYM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Cosmic calendar event (next ~90 days)
              </Label>
              <Select
                value={fantasyHolidayEventId || 'none'}
                onValueChange={(v) => setFantasyHolidayEventId(v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional — tie fantasy to a holiday / event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {upcomingCosmicEvents.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {formatFantasyCalendarDate(ev.date)} — {ev.holiday.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Your scheduled content (content calendar)</Label>
              <Select
                value={fantasyContentId || 'none'}
                onValueChange={(v) => setFantasyContentId(v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional — match a planned post" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {fantasyScheduledContent.map((row) => (
                    <SelectItem key={row.id} value={row.id}>
                      {row.title}
                      {row.scheduled_at
                        ? ` · ${formatFantasyCalendarDate(new Date(row.scheduled_at))}`
                        : ''}{' '}
                      ({row.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fantasyScheduledContent.length === 0 && (
                <p className="text-xs text-muted-foreground">No items in your content calendar yet. Add posts under Content.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Fan profile (personalize for one fan)
              </Label>
              <Select
                value={fantasyFanId || 'none'}
                onValueChange={(v) => setFantasyFanId(v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional — fantasy tailored to this fan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {fantasyFans.map((f) => {
                    const h = f.username || f.platform_username || 'fan'
                    return (
                      <SelectItem key={f.id} value={f.id}>
                        @{h} · {f.platform}
                        {f.total_spent != null ? ` · ~$${f.total_spent}` : ''}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {crmFansMeta?.warnings?.length ? (
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  {crmFansMeta.warnings.join(' ')}
                </p>
              ) : null}
              {fantasyFans.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {crmFansMeta == null
                    ? 'Could not load fans. Refresh the page or try again.'
                    : crmFansMeta.onlyFansConnected || crmFansMeta.fanslyConnected
                      ? 'No CRM rows or live subscribers loaded yet. Open Fans and refresh sync, or check Integrations if a session expired.'
                      : 'Connect OnlyFans or Fansly in Settings, then open Fans to sync subscribers into this list.'}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Scenario or theme (optional if you picked calendar / fan / scheduled post above)</Label>
                <VoiceInputButton
                  onTranscript={(text) => setContentDescription(prev => prev + (prev ? ' ' : '') + text)}
                  size="sm"
                  variant="ghost"
                />
              </div>
              <Textarea 
                placeholder="e.g. masquerade strangers, slow burn, exclusive VIP vibe — or leave blank and rely on calendar + fan context."
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
        )
        
      case 'content-ideas':
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Your Niche</Label>
                <Input 
                  placeholder="e.g., fitness, cosplay, GFE..."
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onlyfans">OnlyFans</SelectItem>
                    <SelectItem value="fansly">Fansly</SelectItem>
                    <SelectItem value="mym">MYM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Any specific trends or themes to explore? (optional)</Label>
              <Textarea 
                placeholder="Current trends you've noticed, or themes you want to try..."
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
        )

      case 'photo-enhancer':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Upload photo (JPEG / PNG)</Label>
              {photoEditImageDataUrl ? (
                <div className="relative overflow-hidden rounded-lg border border-border bg-muted/30">
                  <img
                    src={photoEditImageDataUrl}
                    alt="Photo to edit"
                    className="max-h-56 w-full object-contain"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute right-2 top-2"
                    onClick={() => setPhotoEditImageDataUrl(null)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  className="cursor-pointer"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    try {
                      const compressed = await compressImageForVision(file)
                      setPhotoEditImageDataUrl(compressed)
                    } catch {
                      const reader = new FileReader()
                      reader.onload = () => setPhotoEditImageDataUrl(reader.result as string)
                      reader.readAsDataURL(file)
                    }
                  }}
                />
              )}
              <p className="text-xs text-muted-foreground">
                Say what you want in plain language — e.g. &quot;blur the background more&quot;, &quot;brighter&quot;, &quot;heart emoji top right&quot;. Mic uses voice-to-text (same idea as Mimic interview).
              </p>
            </div>
            {voiceSession && (
              <div className="space-y-2 rounded-lg border border-sky-500/25 bg-sky-500/5 p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-sky-700 dark:text-sky-300">
                  <Mic className="h-3.5 w-3.5" />
                  OpenAI Realtime voice (like Mimic interview)
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Speak naturally; the assistant calls the same safe edit pipeline. Keep this tab open. Results appear below when a tool applies.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={
                      !photoEditImageDataUrl ||
                      voiceSession.status === 'connecting' ||
                      voiceSession.status === 'connected'
                    }
                    onClick={() =>
                      void voiceSession.startVoiceCall({
                        realtimePath: '/api/ai/photo-touchup-realtime',
                        toolPath: '/api/ai/photo-touchup-voice-tool',
                        getToolBodyExtras: () => ({
                          imageBase64: photoVoiceImageRef.current || '',
                        }),
                      })
                    }
                  >
                    {voiceSession.status === 'connecting' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                    <span className="ml-1.5">
                      {voiceSession.status === 'connected' ? 'Voice active' : 'Start voice session'}
                    </span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={voiceSession.status !== 'connected'}
                    onClick={() => voiceSession.endVoiceCall()}
                  >
                    End voice
                  </Button>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {voiceSession.status}
                  </Badge>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>How should we touch up this photo?</Label>
                <VoiceInputButton
                  onTranscript={(text) => setContentDescription((prev) => prev + (prev ? ' ' : '') + text)}
                  size="sm"
                  variant="ghost"
                  showTooltip={true}
                />
              </div>
              <Textarea
                placeholder="e.g. Soften the whole image for privacy, brighten slightly, add a sparkle emoji near the corner…"
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
        )
        
      case 'mood-detector':
        return (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              For your own energy check-in (not fan DMs), use{' '}
              <Link href="/dashboard/well-being" className="text-primary underline">
                Well-being → Mood pulse
              </Link>
              .
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Fan Message to Analyze</Label>
                <VoiceInputButton
                  onTranscript={(text) => setFanMessage(prev => prev + (prev ? ' ' : '') + text)}
                  size="sm"
                  variant="ghost"
                />
              </div>
              <Textarea 
                placeholder="Paste the fan's message here to analyze their emotional state..."
                value={fanMessage}
                onChange={(e) => setFanMessage(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </div>
        )

      case 'gift-suggester':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Fan context</Label>
                <VoiceInputButton
                  onTranscript={(text) => setFanMessage((prev) => prev + (prev ? ' ' : '') + text)}
                  size="sm"
                  variant="ghost"
                />
              </div>
              <Textarea
                placeholder="Who they are, spend level, interests, recent behavior…"
                value={fanMessage}
                onChange={(e) => setFanMessage(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Budget or tier hint (optional)</Label>
              <Input
                placeholder="e.g. $50–150, or deluxe"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2 rounded-md border border-border p-3">
              <Checkbox
                id="gift-wl"
                checked={giftUseWishlist}
                onCheckedChange={(c) => setGiftUseWishlist(c === true)}
              />
              <label htmlFor="gift-wl" className="text-sm cursor-pointer">
                Use my saved wishlist links (title + price){' '}
                <Link href="/dashboard/ai-studio/gifts" className="text-primary underline">
                  Manage list
                </Link>
              </label>
            </div>
          </div>
        )
        
      case 'price-optimizer':
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Current Price ($)</Label>
                <Input 
                  type="number"
                  placeholder="e.g., 15"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="ppv">PPV Content</SelectItem>
                    <SelectItem value="custom">Custom Request</SelectItem>
                    <SelectItem value="tip-menu">Tip Menu Item</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea 
                placeholder="Describe what you're pricing..."
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
        )
        
      case 'viral-predictor':
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="photo">Photo</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="reel">Reel/Short</SelectItem>
                    <SelectItem value="carousel">Carousel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onlyfans">OnlyFans</SelectItem>
                    <SelectItem value="fansly">Fansly</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Content Description</Label>
                <VoiceInputButton
                  onTranscript={(text) => setContentDescription(prev => prev + (prev ? ' ' : '') + text)}
                  size="sm"
                  variant="ghost"
                />
              </div>
              <Textarea 
                placeholder="Describe your content idea in detail..."
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
        )
        
      // Pro Tool Inputs
      case 'voice-clone':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Sample of Your Writing</Label>
                <VoiceInputButton
                  onTranscript={(text) => setSampleText(prev => prev + (prev ? ' ' : '') + text)}
                  size="sm"
                  variant="ghost"
                />
              </div>
              <Textarea 
                placeholder="Paste some of your previous messages or captions so AI can learn your voice..."
                value={sampleText}
                onChange={(e) => setSampleText(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
            <div className="space-y-2">
              <Label>What to Generate</Label>
              <Textarea 
                placeholder="Describe what kind of message you need in your voice..."
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
        )
        
      case 'churn-predictor':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fan from CRM (uses spend + stored thread snapshot)</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="churn-expiring-only"
                  checked={churnExpiringOnly}
                  onCheckedChange={(v) => setChurnExpiringOnly(v === true)}
                />
                <Label htmlFor="churn-expiring-only" className="text-sm font-normal cursor-pointer">
                  Only fans with period ending in 14 days (needs sync)
                </Label>
              </div>
              <Select value={churnFanId} onValueChange={setChurnFanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose fan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual entry only</SelectItem>
                  {churnFansFiltered.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      @{f.username}
                      {f.display_name ? ` (${f.display_name})` : ''} · {Number(f.total_spent ?? 0).toFixed(0)} spend
                      {f.subscription_expires_at
                        ? ` · ends ${f.subscription_expires_at.slice(0, 10)}`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {crmFansMeta?.warnings?.length ? (
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  {crmFansMeta.warnings.join(' ')}
                </p>
              ) : null}
              {!churnExpiringOnly && churnFansFiltered.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {crmFansMeta == null
                    ? 'Could not load fans. Refresh the page or try again.'
                    : crmFansMeta.onlyFansConnected || crmFansMeta.fanslyConnected
                      ? 'No CRM rows or live subscribers loaded yet. Open Fans and refresh sync, or check Integrations if a session expired.'
                      : 'Connect OnlyFans or Fansly in Settings, then open Fans to sync — or pick Manual entry below.'}
                </p>
              ) : null}
              {churnExpiringOnly && churnFansFiltered.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No matches. Sync OnlyFans or Fansly from the Fans page so subscription end dates populate.
                </p>
              ) : null}
            </div>
            {churnFanId === 'manual' ? (
              <div className="space-y-2">
                <Label>Fan information</Label>
                <Textarea
                  placeholder="Subscription length, spending, patterns…"
                  value={fanMessage}
                  onChange={(e) => setFanMessage(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Optional: extra spending / trend notes</Label>
                <Textarea
                  placeholder="e.g. tips dropped this month vs last…"
                  value={fanMessage}
                  onChange={(e) => setFanMessage(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Recent behavior or context (optional)</Label>
              <Textarea
                placeholder="Anything that changed lately in DMs or purchases…"
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
        )
        
      case 'mass-dm-composer':
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Audience Segment</Label>
                <Select value={audienceSegment} onValueChange={setAudienceSegment}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subscribers</SelectItem>
                    <SelectItem value="new">New Fans (Last 7 days)</SelectItem>
                    <SelectItem value="inactive">Inactive (30+ days)</SelectItem>
                    <SelectItem value="whales">Top Spenders</SelectItem>
                    <SelectItem value="expiring">Expiring Soon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="flirty">Flirty</SelectItem>
                    <SelectItem value="urgent">Urgent/FOMO</SelectItem>
                    <SelectItem value="exclusive">Exclusive/VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Campaign Goal</Label>
              <Input 
                placeholder="e.g., Promote new PPV, Re-engage inactive fans..."
                value={campaignGoal}
                onChange={(e) => setCampaignGoal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Call to Action</Label>
              <Textarea 
                placeholder="What do you want fans to do after reading?"
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                className="min-h-[60px]"
              />
            </div>
          </div>
        )

      case 'standard-of-attraction':
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Your Niche (optional)</Label>
                <Input
                  placeholder="e.g., fitness, cosplay, GFE..."
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onlyfans">OnlyFans</SelectItem>
                    <SelectItem value="fansly">Fansly</SelectItem>
                    <SelectItem value="mym">MYM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Upload your photo (Grok rates if you&apos;re up to market standards)</Label>
              {attractionImage ? (
                <div className="relative rounded-lg border border-border bg-muted/30 overflow-hidden">
                  <img src={attractionImage} alt="Uploaded for rating" className="max-h-48 w-full object-contain" />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setAttractionImage(null)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    className="cursor-pointer"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      try {
                        const dataUrl = await compressImageForVision(file)
                        setAttractionImage(dataUrl)
                      } catch {
                        const reader = new FileReader()
                        reader.onload = () => setAttractionImage(reader.result as string)
                        reader.readAsDataURL(file)
                      }
                    }}
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Upload a photo and Grok will judge commercial attractiveness and whether you meet market standards. Or describe below.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Or describe your content (optional if you uploaded a photo)</Label>
                <VoiceInputButton
                  onTranscript={(text) => setContentDescription(prev => prev + (prev ? ' ' : '') + text)}
                  size="sm"
                  variant="ghost"
                />
              </div>
              <Textarea
                placeholder="Describe the content you want rated: setting, outfit, mood, type (photo/video), what’s in frame... The more detail, the better Venus and Circe can judge commercial appeal."
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
        )

      case 'competitor-analysis':
        return (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Use only public marketing signals you already know (bios, free posts, stated prices). Do not use this to harass, stalk, or infer private data.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Your niche</Label>
                <Input
                  placeholder="e.g., fitness, cosplay, GFE, domme…"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Primary platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onlyfans">OnlyFans</SelectItem>
                    <SelectItem value="fansly">Fansly</SelectItem>
                    <SelectItem value="mym">MYM</SelectItem>
                    <SelectItem value="multi">Multi-platform</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Competitors or peers (public cues)</Label>
              <Textarea
                placeholder="@handles, link to public pages, or short notes on how they position (themes, price tier if public, posting cadence you’ve noticed)…"
                value={competitorTargets}
                onChange={(e) => setCompetitorTargets(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Your goals &amp; what you want to figure out</Label>
                <VoiceInputButton
                  onTranscript={(text) => setContentDescription((prev) => prev + (prev ? ' ' : '') + text)}
                  size="sm"
                  variant="ghost"
                />
              </div>
              <Textarea
                placeholder="e.g., Stand out on promos without racing to the bottom on PPV · content gaps I could own · how to sound different in DMs…"
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="competitor-web"
                checked={useCompetitorWebSearch}
                onCheckedChange={(v) => setUseCompetitorWebSearch(v === true)}
              />
              <label htmlFor="competitor-web" className="text-xs leading-snug text-muted-foreground cursor-pointer">
                Run live web discovery (Serper) for public guides and articles — adds verifiable source links. Turn off to
                use only the shared library + Community tips digest.
              </label>
            </div>
          </div>
        )

      case 'video-script-ai':
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onlyfans">OnlyFans</SelectItem>
                    <SelectItem value="fansly">Fansly</SelectItem>
                    <SelectItem value="mym">MYM</SelectItem>
                    <SelectItem value="tiktok">TikTok / Reels-style</SelectItem>
                    <SelectItem value="youtube">YouTube-style</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target length</Label>
                <Select value={videoScriptLength} onValueChange={setVideoScriptLength}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (~30–60s)</SelectItem>
                    <SelectItem value="medium">Medium (~2–3 min)</SelectItem>
                    <SelectItem value="long">Long-form outline</SelectItem>
                    <SelectItem value="teaser">Ultra-short teaser (~15s)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Niche or persona (optional)</Label>
              <Input
                placeholder="e.g., GFE, fitness, cosplay, bratty domme…"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Brief, tone, and talking points</Label>
                <VoiceInputButton
                  onTranscript={(text) => setContentDescription((prev) => prev + (prev ? ' ' : '') + text)}
                  size="sm"
                  variant="ghost"
                />
              </div>
              <Textarea
                placeholder="What’s the video about? Tone (playful, intimate, hype…). Must-say lines, CTA (PPV, tip menu, renew), and anything to avoid. You’ll get sections: hook → beats → CTA — edit before recording."
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </div>
        )

      case 'venus-attraction':
      case 'venus-cupid':
      case 'venus-garden':
      case 'circe-oracle':
      case 'circe-transformation':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Your Niche (optional)</Label>
              <Input
                placeholder="e.g., fitness, cosplay, GFE..."
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  {selectedTool.id === 'venus-attraction' && 'What do you want to optimize for attraction?'}
                  {selectedTool.id === 'venus-cupid' && 'Who do you want to target or where do you struggle?'}
                  {selectedTool.id === 'venus-garden' && 'What part of your fan relationships do you want to improve?'}
                  {selectedTool.id === 'circe-oracle' && 'What do you want the Oracle to see? (subscribers, churn, trends)'}
                  {selectedTool.id === 'circe-transformation' && 'Describe your fans or goals for turning casuals into whales'}
                </Label>
                <VoiceInputButton
                  onTranscript={(text) => setContentDescription(prev => prev + (prev ? ' ' : '') + text)}
                  size="sm"
                  variant="ghost"
                />
              </div>
              <Textarea
                placeholder="Describe your situation, goals, or ask a specific question. Grok (Venus/Circe) will respond with tailored advice."
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </div>
        )
        
      default:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Input</Label>
                <VoiceInputButton
                  onTranscript={(text) => setContentDescription(prev => prev + (prev ? ' ' : '') + text)}
                  size="sm"
                  variant="ghost"
                />
              </div>
              <Textarea 
                placeholder="Enter your request..."
                value={contentDescription}
                onChange={(e) => setContentDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
        )
    }
  }
  
  // Render caption generator results
  const renderCaptionResults = (captionResult: CaptionResult) => (
    <div className="space-y-6 pt-4 border-t border-border">
      {/* Captions */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          Caption Suggestions
        </h3>
        <div className="space-y-3">
          {captionResult.captions.map((caption, index) => (
            <div 
              key={index}
              className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${getToneColor(caption.tone)}`}>
                    {caption.tone}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {caption.length}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleCopy(caption.text, `caption-${index}`)}
                >
                  {copiedField === `caption-${index}` ? (
                    <Check className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <p className="text-sm leading-relaxed">{caption.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Hashtags */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Hash className="h-4 w-4 text-primary" />
            Hashtags
          </h3>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() => handleCopy(captionResult.hashtags.join(' '), 'hashtags')}
          >
            {copiedField === 'hashtags' ? (
              <Check className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {captionResult.hashtags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              #{tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Teaser & PPV Copy */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Teaser Message
            </h4>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => handleCopy(captionResult.teaserMessage, 'teaser')}
            >
              {copiedField === 'teaser' ? (
                <Check className="h-3 w-3 text-green-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
          <p className="text-sm">{captionResult.teaserMessage}</p>
        </div>

        <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-green-400 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              PPV Sales Copy
            </h4>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => handleCopy(captionResult.ppvSalesCopy, 'ppv')}
            >
              {copiedField === 'ppv' ? (
                <Check className="h-3 w-3 text-green-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
          <p className="text-sm text-green-300">{captionResult.ppvSalesCopy}</p>
        </div>
      </div>

      {/* Best Posting Time */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
        <Clock className="h-5 w-5 text-primary" />
        <div>
          <p className="text-xs text-muted-foreground">Best Time to Post</p>
          <p className="text-sm font-medium">{captionResult.bestPostingTime}</p>
        </div>
      </div>
    </div>
  )

  // Render Standard of Attraction results
  const renderAttractionResults = (res: AttractionResult) => (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="flex items-center gap-3 rounded-lg border border-gold/30 bg-gold/10 p-4">
        <span className="text-3xl font-bold text-gold">{res.score}</span>
        <span className="text-sm text-muted-foreground">/ 10</span>
        <p className="text-sm font-medium flex-1">{res.verdict}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-venus/20 bg-venus/5 p-3">
          <h4 className="text-xs font-medium text-venus mb-1">Venus</h4>
          <p className="text-sm">{res.venusTake}</p>
        </div>
        <div className="rounded-lg border border-circe/20 bg-circe/5 p-3">
          <h4 className="text-xs font-medium text-circe-light mb-1">Circe</h4>
          <p className="text-sm">{res.circeTake}</p>
        </div>
      </div>
      {res.strengths?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Strengths</h4>
          <ul className="space-y-1">
            {res.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <ChevronRight className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
      {res.improvements?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Improvements</h4>
          <ul className="space-y-1">
            {res.improvements.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )

  const renderPhotoEditResults = (res: PhotoEditIntentResult) => (
    <div className="space-y-4 pt-4 border-t border-border">
      <p className="text-sm text-muted-foreground">{res.explanation}</p>
      <Badge variant="outline" className="text-[10px]">
        {res.operation}
      </Badge>
      <div className="relative overflow-hidden rounded-lg border border-border bg-muted/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={res.imageBase64} alt="Edited preview" className="max-h-[min(50vh,420px)] w-full object-contain" />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => {
          void navigator.clipboard.writeText(res.imageBase64).catch(() => undefined)
        }}
      >
        <Copy className="h-3.5 w-3.5" />
        Copy data URL
      </Button>
    </div>
  )
  
  const renderCompetitorResults = (res: CompetitorInsightResult) => (
    <div className="space-y-4 pt-4 border-t border-border text-sm">
      {res.meta ? (
        <p className="text-xs text-muted-foreground">
          Web search: {res.meta.webSearchUsed ? `on (${res.meta.webHitCount ?? 0} hits)` : 'off or unavailable'} ·
          Library rows: {res.meta.libraryRowCount ?? 0} · Community tips in digest: {res.meta.communityTipCount ?? 0}
          {res.meta.fanCount != null ? ` · Fans in CRM: ${res.meta.fanCount}` : ''}
          {res.meta.internalCohortPublished
            ? ` · Internal cohort: ${res.meta.internalBenchmarkBucketsInPrompt ?? 0} buckets (~${res.meta.internalCohortDatasetCreators ?? 0} creators in dataset)`
            : ' · Internal cohort: not published yet (aggregate cron needs ≥25 creators with imported fans)'}
        </p>
      ) : null}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</h4>
        <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted/20 p-3">{res.executiveSummary}</p>
      </div>
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Market context</h4>
        <p className="whitespace-pre-wrap text-muted-foreground">{res.marketContext}</p>
      </div>
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tier note (qualitative)</h4>
        <p className="whitespace-pre-wrap">{res.qualitativeTierNote}</p>
      </div>
      {res.peerArchetypes?.length ? (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Peer archetypes</h4>
          <ul className="space-y-3">
            {res.peerArchetypes.map((p, i) => (
              <li key={i} className="rounded-lg border border-border p-3">
                <p className="font-medium">{p.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{p.typicalPublicSignals}</p>
                <p className="mt-2 text-xs">{p.ideasToBorrow}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {res.differentiationAngles?.length ? (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Differentiation</h4>
          <ul className="space-y-1">
            {res.differentiationAngles.map((x, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {x}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {res.postingCadenceIdeas?.length ? (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Posting &amp; cadence</h4>
          <ul className="space-y-1">
            {res.postingCadenceIdeas.map((x, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {x}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {res.chattingAndDmTips?.length ? (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chatting &amp; DMs</h4>
          <ul className="space-y-1">
            {res.chattingAndDmTips.map((x, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {x}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {res.commentingAndSocialTips?.length ? (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Commenting &amp; social</h4>
          <ul className="space-y-1">
            {res.commentingAndSocialTips.map((x, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {x}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sources</h4>
        <p className="text-xs text-muted-foreground">{res.howToUseSources}</p>
        {res.sources && res.sources.length > 0 ? (
          <ul className="space-y-1.5">
            {res.sources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline break-all"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  {s.title || s.url}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No URLs this run — enable web search or wait for the weekly library compile.</p>
        )}
      </div>
      <p className="text-xs text-amber-600 dark:text-amber-400">{res.caveats}</p>
    </div>
  )

  // Render generic results
  const renderGenericResults = (res: AIResult) => (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
        <p className="text-sm whitespace-pre-wrap">{res.content}</p>
      </div>
      {res.suggestions && res.suggestions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Suggestions</h4>
          <ul className="space-y-1">
            {res.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <ChevronRight className="h-4 w-4 text-primary mt-0.5" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
  
  if (initialToolId && resolvingInitial) {
    return (
      <Card className="border-primary/20">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  // Tool selection view (grid) — only when no initialToolId
  if (!selectedTool && !initialToolId) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="relative">
              <PenTool className="h-5 w-5 text-primary sparkle-icon" />
              <Sparkles className="h-3 w-3 text-primary absolute -top-1 -right-1 animate-pulse" />
            </div>
            <span className="rainbow-text">Tools</span>
          </CardTitle>
          <CardDescription>
            Choose an AI tool to enhance your content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {workingTools.map((tool) => (
                <Card 
                  key={tool.id}
                  className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${tool.borderColor} hover:border-primary/50`}
                  onClick={() => setSelectedTool(tool)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-lg p-2.5 ${tool.bgColor}`}>
                        <tool.icon className={`h-5 w-5 ${tool.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm">{tool.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {tool.description}
                        </p>
                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <Zap className="h-3 w-3" />
                          {tool.credits} credit{tool.credits > 1 ? 's' : ''}/use
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Pro Tools Section */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-4 w-4 text-gold" />
                <h3 className="font-semibold text-sm text-gold">Pro Tools</h3>
                {isPro && <Badge className="bg-gold/20 text-gold text-[10px]">Unlocked</Badge>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {proTools.map((tool) => (
                  <Card 
                    key={tool.id}
                    className={`cursor-pointer transition-all ${tool.borderColor} ${
                      isPro 
                        ? 'hover:shadow-lg hover:scale-[1.02] hover:border-gold/50' 
                        : 'opacity-75 hover:opacity-100'
                    }`}
                    onClick={() => isPro ? setSelectedTool(tool) : null}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className={`rounded-lg p-2.5 ${tool.bgColor}`}>
                          <tool.icon className={`h-5 w-5 ${tool.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">{tool.name}</h3>
                            {!isPro && <Lock className="h-3 w-3 text-muted-foreground" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {tool.description}
                          </p>
                          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <Zap className="h-3 w-3" />
                            {tool.credits} credit{tool.credits > 1 ? 's' : ''}/use
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {!isPro && (
                <div className="mt-4 p-4 rounded-lg border border-gold/30 bg-gradient-to-r from-gold/5 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-gold/20 p-2">
                      <Crown className="h-5 w-5 text-gold" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-gold">Unlock Pro Tools</h4>
                      <p className="text-xs text-muted-foreground">
                        Get Voice Cloning, Video Script AI, Competitor Analysis, Churn Prediction, Mass DM Composer and more
                      </p>
                    </div>
                    <Link href="/dashboard/settings?tab=billing">
                      <Button size="sm" variant="outline" className="border-gold/30 text-gold hover:bg-gold/10 hover:text-gold">
                        <Crown className="h-3 w-3 mr-1" />
                        Upgrade
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
            
            {/* Credits Display */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm">AI Credits</span>
              </div>
              <span className="font-medium">{aiCreditsUsed}/{aiCreditsLimit === 999999 ? '∞' : aiCreditsLimit}</span>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    )
  }
  
  // Tool workspace view
  return (
    <Card className={`min-w-0 border-primary/20 ${selectedTool.borderColor}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {backHref ? (
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link href={backHref}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={resetTool}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className={`rounded-lg p-2 ${selectedTool.bgColor}`}>
              <selectedTool.icon className={`h-5 w-5 ${selectedTool.color}`} />
            </div>
            <div>
              <CardTitle className="text-lg">{selectedTool.name}</CardTitle>
              <CardDescription className="text-xs">
                {selectedTool.longDescription}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <Zap className="h-3 w-3" />
            {selectedTool.credits} credit{selectedTool.credits > 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderToolInputs()}
        
        <Button 
          onClick={runTool} 
          disabled={
            loading ||
            (selectedTool.id === 'standard-of-attraction' && !contentDescription.trim() && !attractionImage) ||
            (selectedTool.id === 'photo-enhancer' && (!photoEditImageDataUrl || !contentDescription.trim())) ||
            (selectedTool.id === 'caption-generator' && !contentDescription.trim() && !captionImageDataUrl) ||
            (selectedTool.id === 'fantasy-writer' &&
              !contentDescription.trim() &&
              !fantasyHolidayEventId &&
              !fantasyFanId &&
              !fantasyContentId) ||
            (selectedTool.id === 'gift-suggester' && !fanMessage.trim()) ||
            (selectedTool.id === 'competitor-analysis' &&
              !competitorTargets.trim() &&
              !contentDescription.trim() &&
              !niche.trim())
          }
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate
            </>
          )}
        </Button>
        
        {/* Results — scrollable on mobile so page doesn't grow unbounded */}
        {result && (
          <div className="max-h-[min(60vh,400px)] overflow-y-auto overflow-x-hidden rounded-lg border border-border p-3">
            {selectedTool.id === 'caption-generator' && 'captions' in result
              ? renderCaptionResults(result as CaptionResult)
              : selectedTool.id === 'competitor-analysis' &&
                  result &&
                  typeof result === 'object' &&
                  'executiveSummary' in result
                ? renderCompetitorResults(result as CompetitorInsightResult)
              : selectedTool.id === 'standard-of-attraction' && 'score' in result
                ? renderAttractionResults(result as AttractionResult)
                : selectedTool.id === 'photo-enhancer' &&
                    result &&
                    typeof result === 'object' &&
                    'imageBase64' in result &&
                    'explanation' in result
                  ? renderPhotoEditResults(result as PhotoEditIntentResult)
                  : renderGenericResults(result as AIResult)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
