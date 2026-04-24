'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { isPaidPlanId } from '@/lib/billing/access'
import { effectiveMonthlyCreditLimit, formatToolCreditCost } from '@/lib/billing/credit-economics'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Wand2, 
  PenTool, 
  Lightbulb, 
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
  Gift,
  Camera,
  Users,
  TrendingDown,
  TrendingUp,
  Send,
  Eye,
  ExternalLink,
  ListTree,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getToolMeta, resolveCanonicalToolId } from '@/lib/ai-tools-data'
import { ToolHelpDialog } from '@/components/ai/tool-help-dialog'
import { runToolInputsSwitch } from '@/components/ai/tool-runners/run-tool-inputs-switch'
import { EasyProModeToggle } from '@/components/ui/easy-pro-mode-toggle'
import { useToolRunnerUiMode } from '@/hooks/use-tool-runner-ui-mode'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
  liveCrmFanToChurnFanData,
  type ChurnFanPickerRow,
} from '@/lib/crm/fetch-crm-fans-client'
import type { CrmFansResponse } from '@/lib/crm/crm-fan-types'

import { formatFantasyRunnerDate } from '@/lib/calendar/format-fantasy-runner-date'
import type { FantasyFanPickerRow, FantasyScheduledRow } from '@/components/ai/tool-runners/fantasy-writer-inputs'

/** Visual-only fields; names/descriptions come from `getToolMeta` to match ALL_TOOLS_META. */
const WORKING_TOOL_ROWS = [
  {
    id: 'fantasy-writer',
    icon: PenTool,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  {
    id: 'content-ideas',
    icon: Lightbulb,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  {
    id: 'photo-enhancer',
    icon: Camera,
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
  },
  {
    id: 'gift-suggester',
    icon: Gift,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
  },
  {
    id: 'brand-uniformity',
    icon: Sparkles,
    color: 'text-fuchsia-500',
    bgColor: 'bg-fuchsia-500/10',
    borderColor: 'border-fuchsia-500/30',
  },
] as const

const workingTools = WORKING_TOOL_ROWS.map((row) => {
  const m = getToolMeta(row.id)
  return {
    ...row,
    name: m?.name ?? row.id,
    description: m?.description ?? '',
    longDescription: m?.longDescription ?? '',
  }
})

const PRO_TOOL_ROWS = [
  {
    id: 'pricing-optimizer',
    icon: DollarSign,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  {
    id: 'churn-predictor',
    icon: TrendingDown,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/35',
  },
  {
    id: 'income-predictor',
    icon: TrendingUp,
    color: 'text-circe',
    bgColor: 'bg-circe/10',
    borderColor: 'border-circe/35',
  },
  {
    id: 'mass-dm-composer',
    icon: Send,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'competitor-analysis',
    icon: Eye,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
] as const

const proTools = PRO_TOOL_ROWS.map((row) => {
  const canonical = resolveCanonicalToolId(row.id)
  const m = getToolMeta(canonical)
  return {
    ...row,
    name: m?.name ?? row.id,
    description: m?.description ?? '',
    longDescription: m?.longDescription ?? '',
    isPro: true as const,
  }
})

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

interface CupidArrowResult extends AIResult {
  newFans?: Array<{
    id: string
    username: string
    displayName: string | null
    platform: string
    source: string
    subscriptionStart: string | null
    lastInteraction: string | null
    totalSpent: number
  }>
  meta?: { hybridTotal?: number; databaseCount?: number; warnings?: string[] }
  markedForChurnCount?: number
  tagForChurn?: boolean
}

/** Response from POST /api/ai/income-predictor (same shape as full dashboard load). */
interface IncomePredictorApiResult {
  context?: {
    currentMonthlyUsdEstimate?: number | null
    openLeakAlerts?: number
    onlyFansConnected?: boolean
    partnerForecastError?: string | null
  }
  heuristics?: {
    level: string
    message: string
    suggestedNextTierOrRange?: string | null
  }
  ai?: {
    headline?: string
    summary?: string
    partnerForecastNarrative?: string
    nextMonthTargetAssessment?: string
    strategies?: Array<{ title: string; detail: string }>
    leakAndProtection?: string
    postingCadenceAdvice?: string
  }
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
  improvementPriorities?: string[]
  caveats: string
  cohortPercentileSummary?: string
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
  const searchParams = useSearchParams()
  /** Fused "Content Ideas" workspace: trending ideas vs caption generator (same card). */
  const [contentStudioSubtab, setContentStudioSubtab] = useState<'ideas' | 'captions'>('ideas')
  const [resolvingInitial, setResolvingInitial] = useState(!!initialToolId)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CaptionResult | ContentIdeasResult | AIResult | IncomePredictorApiResult | null>(
    null,
  )
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isPro, setIsPro] = useState(false)
  const [aiCreditsUsed, setAiCreditsUsed] = useState(0)
  const [aiCreditsLimit, setAiCreditsLimit] = useState(100)
  const [toolRunError, setToolRunError] = useState<string | null>(null)
  const supabase = createClient()
  
  // Check subscription status
  const loadSubscription = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const { data } = await supabase
      .from('subscriptions')
      .select(
        'plan_id, ai_credits_used, ai_credits_limit, billing_variant, revenue_tier, billing_focus_platform, billing_focus_platforms, billing_seats',
      )
      .eq('user_id', user.id)
      .single()
    
    if (data) {
      const planId = (data as { plan_id?: string | null }).plan_id as string | null | undefined
      const normalized = planId?.toLowerCase() || null
      setIsPro(Boolean(normalized && isPaidPlanId(normalized)))
      setAiCreditsUsed(data.ai_credits_used || 0)
      setAiCreditsLimit(
        effectiveMonthlyCreditLimit({
          plan_id: data.plan_id,
          billing_variant: (data as { billing_variant?: string | null }).billing_variant,
          revenue_tier: (data as { revenue_tier?: number | null }).revenue_tier,
          billing_focus_platform: (data as { billing_focus_platform?: string | null }).billing_focus_platform,
          billing_focus_platforms: (data as { billing_focus_platforms?: string[] | null }).billing_focus_platforms,
          billing_seats: (data as { billing_seats?: number | null }).billing_seats,
          ai_credits_limit: data.ai_credits_limit,
        }),
      )
    }
  }, [supabase])
  
  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  /** Which API + form to run when Content Ideas card is open (ideas vs fused caption generator). */
  const effectiveRunnerId = useMemo(() => {
    if (!selectedTool) return null
    if (selectedTool.id === 'content-ideas' && contentStudioSubtab === 'captions') {
      return 'caption-generator'
    }
    return selectedTool.id
  }, [selectedTool, contentStudioSubtab])

  const runnerStorageKey = useMemo(
    () => (effectiveRunnerId ? resolveCanonicalToolId(effectiveRunnerId) : null),
    [effectiveRunnerId],
  )
  const { mode: runnerMode, setMode: setRunnerMode } = useToolRunnerUiMode(runnerStorageKey)

  useEffect(() => {
    if (!initialToolId) {
      setResolvingInitial(false)
      return
    }
    const tabParam = searchParams.get('tab')
    const mappedId = initialToolId === 'caption-generator' ? 'content-ideas' : initialToolId
    const all = [...workingTools, ...proTools]
    const found = all.find((t) => t.id === mappedId)
    if (found) {
      setSelectedTool(found)
    } else {
      setSelectedTool(makeGenericTool(initialToolId) as ToolType)
    }
    if (mappedId === 'content-ideas') {
      setContentStudioSubtab(
        initialToolId === 'caption-generator' || tabParam === 'captions' ? 'captions' : 'ideas',
      )
    } else {
      setContentStudioSubtab('ideas')
    }
    setResolvingInitial(false)
  }, [initialToolId, searchParams])
  
  // Form states for different tools
  const [contentType, setContentType] = useState('photo')
  const [competitorTargets, setCompetitorTargets] = useState('')
  const [useCompetitorWebSearch, setUseCompetitorWebSearch] = useState(true)
  const [contentDescription, setContentDescription] = useState('')
  const [platform, setPlatform] = useState('onlyfans')
  const [niche, setNiche] = useState('')
  const [fanMessage, setFanMessage] = useState('')
  const [currentPrice, setCurrentPrice] = useState('')
  
  // Pro tool specific states
  const [audienceSegment, setAudienceSegment] = useState('all')
  const [campaignGoal, setCampaignGoal] = useState('')
  const [attractionImage, setAttractionImage] = useState<string | null>(null)
  const [captionImageDataUrl, setCaptionImageDataUrl] = useState<string | null>(null)
  const [photoEditImageDataUrl, setPhotoEditImageDataUrl] = useState<string | null>(null)
  photoVoiceImageRef.current = photoEditImageDataUrl
  const [giftUseWishlist, setGiftUseWishlist] = useState(true)
  const [churnFanId, setChurnFanId] = useState<string>('manual')
  const [churnExpiringOnly, setChurnExpiringOnly] = useState(false)
  const [churnFans, setChurnFans] = useState<ChurnFanPickerRow[]>([])
  const [incomePredictorMode, setIncomePredictorMode] = useState<'maintain' | 'grow'>('maintain')
  const [incomePredictorGoal, setIncomePredictorGoal] = useState('')
  const [incomeCalendarMode, setIncomeCalendarMode] = useState<'week' | 'month'>('month')
  const [cupidTagChurn, setCupidTagChurn] = useState(true)

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

  const [fantasyFans, setFantasyFans] = useState<FantasyFanPickerRow[]>([])
  const [fantasyScheduledContent, setFantasyScheduledContent] = useState<FantasyScheduledRow[]>([])
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
      setFantasyScheduledContent((contentRes.data as FantasyScheduledRow[]) || [])
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
    if (!selectedTool || !effectiveRunnerId) return

    setLoading(true)
    setResult(null)
    setToolRunError(null)

    try {
      let response: Response

      switch (effectiveRunnerId) {
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
                return `${ev.holiday.name} (${formatFantasyRunnerDate(ev.date)}, ${ev.holiday.type}). Content angle: ${ev.holiday.contentIdea}`
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
                  ? formatFantasyRunnerDate(new Date(c.scheduled_at))
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
          
        case 'churn-predictor': {
          const selectedChurn = churnFans.find((x) => x.id === churnFanId)
          const liveOnly =
            churnFanId !== 'manual' &&
            selectedChurn &&
            selectedChurn._source !== 'database'
          response = await fetch('/api/ai/churn-predictor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
              liveOnly
                ? {
                    fanData: liveCrmFanToChurnFanData(selectedChurn),
                    recentActivity: contentDescription || undefined,
                    spendingHistory: fanMessage || undefined,
                  }
                : churnFanId !== 'manual'
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
        }
          
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

        case 'venus-cupid':
          response = await fetch('/api/ai/venus-cupid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tagForChurn: cupidTagChurn,
            }),
          })
          break
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

        case 'income-predictor': {
          const g = incomePredictorGoal.trim().replace(/,/g, '')
          const goalNum = g ? Number(g) : NaN
          response = await fetch('/api/ai/income-predictor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              calendarMode: incomeCalendarMode,
              mode: incomePredictorMode,
              goalUsd:
                incomePredictorMode === 'grow' && Number.isFinite(goalNum) && goalNum > 0 ? goalNum : null,
            }),
          })
          break
        }

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
        const msg =
          typeof data.error === 'string'
            ? data.error
            : `Request failed (${response.status})`
        setToolRunError(msg)
        setResult(null)
        if (response.status === 402) {
          void loadSubscription()
        }
        return
      }

      setResult(data)
    } catch (error) {
      console.error('Tool error:', error)
      setToolRunError(error instanceof Error ? error.message : 'Something went wrong')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }
  
  const resetTool = () => {
    setSelectedTool(null)
    setContentStudioSubtab('ideas')
    setToolRunError(null)
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
    setCompetitorTargets('')
    setUseCompetitorWebSearch(true)
    setGiftUseWishlist(true)
    setCupidTagChurn(true)
  }
  
  // Render tool-specific input form
  const renderToolInputs = () => {
    if (!selectedTool || !effectiveRunnerId) return null

    return runToolInputsSwitch({
      effectiveRunnerId,
      runnerMode,
      platform,
      setPlatform,
      contentType,
      setContentType,
      captionImageDataUrl,
      setCaptionImageDataUrl,
      contentDescription,
      setContentDescription,
      niche,
      setNiche,
      fanMessage,
      setFanMessage,
      currentPrice,
      setCurrentPrice,
      photoEditImageDataUrl,
      setPhotoEditImageDataUrl,
      voiceSession,
      photoVoiceImageRef,
      giftUseWishlist,
      setGiftUseWishlist,
      churnFanId,
      setChurnFanId,
      churnFans,
      churnFansFiltered,
      churnExpiringOnly,
      setChurnExpiringOnly,
      incomePredictorMode,
      setIncomePredictorMode,
      incomePredictorGoal,
      setIncomePredictorGoal,
      incomeCalendarMode,
      setIncomeCalendarMode,
      campaignGoal,
      setCampaignGoal,
      audienceSegment,
      setAudienceSegment,
      attractionImage,
      setAttractionImage,
      competitorTargets,
      setCompetitorTargets,
      useCompetitorWebSearch,
      setUseCompetitorWebSearch,
      cupidTagChurn,
      setCupidTagChurn,
      upcomingCosmicEvents,
      fantasyHolidayEventId,
      setFantasyHolidayEventId,
      fantasyContentId,
      setFantasyContentId,
      fantasyFanId,
      setFantasyFanId,
      fantasyFans,
      fantasyScheduledContent,
      crmFansMeta,
    })
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
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Competitors — same band vs one tier up
          </h4>
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
      {res.cohortPercentileSummary ? (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your cohort (imported fans)
          </h4>
          <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted/20 p-3 text-muted-foreground">
            {res.cohortPercentileSummary}
          </p>
        </div>
      ) : null}
      {res.improvementPriorities?.length ? (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Prioritized improvements
          </h4>
          <ul className="space-y-1">
            {res.improvementPriorities.map((x, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {x}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="text-xs text-amber-600 dark:text-amber-400">{res.caveats}</p>
    </div>
  )

  const renderIncomePredictorResults = (res: IncomePredictorApiResult) => {
    const ai = res.ai
    const h = res.heuristics
    const ctx = res.context
    return (
      <div className="space-y-4 border-t border-border pt-4">
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-circe/90">
          <TrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Income predictor readout
        </p>
        <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
          {ai?.headline ? <p className="text-sm font-semibold text-foreground">{ai.headline}</p> : null}
          {ai?.summary ? (
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{ai.summary}</p>
          ) : null}
          {!ai?.headline && !ai?.summary ? (
            <p className="text-xs text-muted-foreground">No summary returned. Open the full Income Predictor for details.</p>
          ) : null}
          {h?.level ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">Goal realism:</span>
              <Badge variant="secondary" className="capitalize">
                {h.level}
              </Badge>
              {h.suggestedNextTierOrRange ? (
                <span className="text-muted-foreground">Next band: {h.suggestedNextTierOrRange}</span>
              ) : null}
            </div>
          ) : null}
          {h?.message ? <p className="text-xs text-muted-foreground leading-relaxed">{h.message}</p> : null}
          {ai?.nextMonthTargetAssessment ? (
            <p className="text-xs text-muted-foreground border-l-2 border-circe/30 pl-2">{ai.nextMonthTargetAssessment}</p>
          ) : null}
          {ai?.strategies && ai.strategies.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {ai.strategies.slice(0, 6).map((s, i) => (
                <li key={i} className="flex gap-2">
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    <span className="font-medium text-foreground">{s.title}</span>
                    {s.detail ? <span className="text-muted-foreground"> — {s.detail}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {ctx?.partnerForecastError ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">{ctx.partnerForecastError}</p>
          ) : null}
          {typeof ctx?.openLeakAlerts === 'number' && ctx.openLeakAlerts > 0 ? (
            <p className="text-xs text-muted-foreground">
              Open leak alerts: {ctx.openLeakAlerts} — review under Protection.
            </p>
          ) : null}
          <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
            <Link href="/dashboard/analytics/income-predictor">Open full Income Predictor</Link>
          </Button>
        </div>
      </div>
    )
  }

  const renderCupidResults = (res: CupidArrowResult) => (
    <div className="space-y-4 border-t border-border pt-4">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <Badge variant="secondary" className="gap-1 font-normal">
          <Users className="h-3 w-3" aria-hidden />
          {Array.isArray(res.newFans) ? res.newFans.length : 0} newest in batch
        </Badge>
        {typeof res.markedForChurnCount === 'number' && res.tagForChurn !== false ? (
          <Badge variant="outline" className="gap-1 border-amber-500/35 font-normal text-amber-700 dark:text-amber-300">
            <TrendingDown className="h-3 w-3" aria-hidden />
            {res.markedForChurnCount} CRM fan{res.markedForChurnCount === 1 ? '' : 's'} tagged for churn follow-up
          </Badge>
        ) : null}
      </div>
      {res.meta?.warnings && res.meta.warnings.length > 0 ? (
        <ul className="list-inside list-disc space-y-0.5 text-xs text-amber-700/95 dark:text-amber-300/95">
          {res.meta.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      ) : null}
      {Array.isArray(res.newFans) && res.newFans.length > 0 ? (
        <div className="rounded-lg border border-border bg-muted/20">
          <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
            Newest fans (CRM + live lists)
          </div>
          <ul className="max-h-[220px] space-y-1.5 overflow-y-auto p-3 text-xs">
            {res.newFans.map((f) => (
              <li key={f.id} className="flex flex-col gap-0.5 rounded-md bg-background/60 px-2 py-1.5">
                <span className="font-medium text-foreground">
                  @{f.username}
                  {f.displayName ? <span className="font-normal text-muted-foreground"> · {f.displayName}</span> : null}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {f.platform} · {f.source === 'database' ? 'CRM' : f.source === 'live_onlyfans' ? 'Live OF' : 'Live Fansly'}
                  {f.subscriptionStart ? ` · sub ${new Date(f.subscriptionStart).toLocaleDateString()}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{res.content}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/retention/churn">Retention → Churn</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/ai-studio/tools/churn-predictor">Churn Predictor</Link>
        </Button>
      </div>
    </div>
  )

  const renderChurnResults = (res: AIResult) => (
    <div className="space-y-3 border-t border-border pt-4">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-violet-300/90 dark:text-violet-200/85">
        <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Circe retention readout
      </p>
      <div className="rounded-xl border border-violet-500/25 bg-violet-950/25 p-4 dark:bg-violet-950/35">
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{res.content}</p>
      </div>
      {res.suggestions && res.suggestions.length > 0 && (
        <ul className="space-y-1 text-sm text-muted-foreground">
          {res.suggestions.map((suggestion, index) => (
            <li key={index} className="flex gap-2">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  // Render generic results
  const renderGenericResults = (res: AIResult | Record<string, unknown>) => (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
        {typeof (res as AIResult).content === 'string' && (res as AIResult).content.trim() ? (
          <p className="text-sm whitespace-pre-wrap text-foreground">{(res as AIResult).content}</p>
        ) : (
          <pre className="max-h-48 overflow-auto text-left text-xs text-muted-foreground whitespace-pre-wrap break-words">
            {JSON.stringify(res, null, 2)}
          </pre>
        )}
      </div>
      {'suggestions' in res &&
        Array.isArray((res as AIResult).suggestions) &&
        (res as AIResult).suggestions!.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Suggestions</h4>
          <ul className="space-y-1">
            {(res as AIResult).suggestions!.map((suggestion, index) => (
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
                <div key={tool.id} className="relative rounded-xl focus-within:ring-2 focus-within:ring-primary/35">
                  <div
                    className="absolute right-2 top-2 z-10"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <ToolHelpDialog toolId={resolveCanonicalToolId(tool.id)} />
                  </div>
                  <Card
                    className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${tool.borderColor} hover:border-primary/50`}
                    onClick={() => {
                      if (tool.id === 'brand-uniformity') {
                        window.location.href = '/dashboard/brand-uniformity'
                        return
                      }
                      if (tool.id === 'content-ideas') setContentStudioSubtab('ideas')
                      setSelectedTool(tool)
                    }}
                  >
                    <CardContent className="pt-4 pr-11">
                      <div className="flex items-start gap-3">
                        <div className={`rounded-lg p-2.5 ${tool.bgColor}`}>
                          <tool.icon className={`h-5 w-5 ${tool.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold">{tool.name}</h3>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{tool.description}</p>
                          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <Zap className="h-3 w-3" />
                            {formatToolCreditCost(resolveCanonicalToolId(tool.id))}/use
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center gap-2">
                <ListTree className="h-4 w-4 text-amber-500/90" aria-hidden />
                <h3 className="text-sm font-semibold text-foreground">Commenter &amp; Housekeeping</h3>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Web dashboard tools — same entries as AI Studio → Tools library. Housekeeping runs Smart classify (spend,
                threads, freeloaders) into OnlyFans lists and Fansly tags from Arrangements.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative rounded-xl focus-within:ring-2 focus-within:ring-violet-500/35">
                  <div
                    className="absolute right-2 top-2 z-10"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <ToolHelpDialog toolId="commenter" />
                  </div>
                  <Link href="/dashboard/commenter" className="block">
                    <Card className="h-full cursor-pointer border-border transition-all hover:border-violet-500/35 hover:shadow-md">
                      <CardContent className="pt-4 pr-11">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-violet-500/10 p-2.5">
                            <MessageSquare className="h-5 w-5 text-violet-400" aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <h3 className="text-sm font-semibold">Commenter</h3>
                              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              Post comments — draft replies, personas, safety flags.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
                <div className="relative rounded-xl focus-within:ring-2 focus-within:ring-amber-500/35">
                  <div
                    className="absolute right-2 top-2 z-10"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <ToolHelpDialog toolId="housekeeping" />
                  </div>
                  <Link href="/dashboard/commenter?section=housekeeping" className="block">
                    <Card className="h-full cursor-pointer border-border transition-all hover:border-amber-500/40 hover:shadow-md">
                      <CardContent className="pt-4 pr-11">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-amber-500/10 p-2.5">
                            <ListTree className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <h3 className="text-sm font-semibold">Housekeeping</h3>
                              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              Classify by spend &amp; threads; surface freeloaders — sync lists from Arrangements.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </div>
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
                  <div key={tool.id} className="relative rounded-xl focus-within:ring-2 focus-within:ring-gold/40">
                    <div
                      className="absolute right-2 top-2 z-10"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <ToolHelpDialog toolId={resolveCanonicalToolId(tool.id)} />
                    </div>
                    <Card
                      className={`cursor-pointer transition-all ${tool.borderColor} ${
                        isPro
                          ? 'hover:scale-[1.02] hover:border-gold/50 hover:shadow-lg'
                          : 'opacity-75 hover:opacity-100'
                      }`}
                      onClick={() => (isPro ? setSelectedTool(tool) : null)}
                    >
                      <CardContent className="pt-4 pr-11">
                        <div className="flex items-start gap-3">
                          <div className={`rounded-lg p-2.5 ${tool.bgColor}`}>
                            <tool.icon className={`h-5 w-5 ${tool.color}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold">{tool.name}</h3>
                              {!isPro ? <Lock className="h-3 w-3 text-muted-foreground" /> : null}
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{tool.description}</p>
                            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                              <Zap className="h-3 w-3" />
                              {formatToolCreditCost(resolveCanonicalToolId(tool.id))}/use
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
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
                        Get Competitor Analysis, Churn Prediction, Mass DM Composer and more
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
              <span className="font-medium">{aiCreditsUsed}/{aiCreditsLimit}</span>
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {backHref ? (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                <Link href={backHref}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={resetTool}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className={`rounded-lg p-2 ${selectedTool.bgColor} shrink-0`}>
              <selectedTool.icon className={`h-5 w-5 ${selectedTool.color}`} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg">{selectedTool.name}</CardTitle>
              <CardDescription className="text-xs">
                {selectedTool.longDescription}
              </CardDescription>
              {selectedTool.id === 'content-ideas' ? (
                <Tabs
                  value={contentStudioSubtab}
                  onValueChange={(v) => {
                    setContentStudioSubtab(v as 'ideas' | 'captions')
                    setResult(null)
                  }}
                  className="mt-3 w-full max-w-md"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="ideas">Ideas</TabsTrigger>
                    <TabsTrigger value="captions">Captions</TabsTrigger>
                  </TabsList>
                </Tabs>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ToolHelpDialog toolId={resolveCanonicalToolId(selectedTool.id)} />
            <Badge variant="outline" className="gap-1">
              <Zap className="h-3 w-3" />
              {effectiveRunnerId
                ? formatToolCreditCost(resolveCanonicalToolId(effectiveRunnerId))
                : formatToolCreditCost(resolveCanonicalToolId(selectedTool.id))}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/25 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Easy</span> keeps steps short;{' '}
            <span className="font-medium text-foreground">Pro</span> shows every option. Credits apply when a run
            succeeds.
          </p>
          <EasyProModeToggle
            value={runnerMode}
            onChange={setRunnerMode}
            ariaLabel="AI tool layout mode"
            className="shrink-0 self-start sm:self-center"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {toolRunError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not run tool</AlertTitle>
            <AlertDescription>{toolRunError}</AlertDescription>
          </Alert>
        ) : null}
        {renderToolInputs()}
        
        <Button 
          onClick={runTool} 
          disabled={
            loading ||
            (selectedTool.id === 'standard-of-attraction' && !contentDescription.trim() && !attractionImage) ||
            (selectedTool.id === 'photo-enhancer' && (!photoEditImageDataUrl || !contentDescription.trim())) ||
            (effectiveRunnerId === 'caption-generator' && !contentDescription.trim() && !captionImageDataUrl) ||
            (selectedTool.id === 'fantasy-writer' &&
              (runnerMode === 'easy'
                ? !contentDescription.trim()
                : !contentDescription.trim() &&
                  !fantasyHolidayEventId &&
                  !fantasyFanId &&
                  !fantasyContentId)) ||
            (selectedTool.id === 'gift-suggester' && !fanMessage.trim()) ||
            (selectedTool.id === 'competitor-analysis' &&
              !competitorTargets.trim() &&
              !contentDescription.trim() &&
              !niche.trim()) ||
            (selectedTool.id === 'churn-predictor' && churnFanId === 'manual' && !fanMessage.trim()) ||
            (selectedTool.id === 'mass-dm-composer' && runnerMode === 'easy' && !campaignGoal.trim())
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
              {runnerMode === 'easy' && effectiveRunnerId
                ? `Generate — ${formatToolCreditCost(resolveCanonicalToolId(effectiveRunnerId))}`
                : 'Generate'}
            </>
          )}
        </Button>
        {runnerMode === 'easy' && effectiveRunnerId ? (
          <p className="text-center text-[11px] text-muted-foreground">
            This run uses {formatToolCreditCost(resolveCanonicalToolId(effectiveRunnerId))} when it completes
            successfully.
          </p>
        ) : null}
        
        {/* Results — scrollable on mobile so page doesn't grow unbounded */}
        {result && (
          <div
            className={cn(
              'w-full self-start overflow-x-hidden rounded-lg border border-border',
              selectedTool.id === 'churn-predictor' || selectedTool.id === 'income-predictor'
                ? 'max-h-[min(72vh,560px)] min-h-0 overflow-y-auto bg-muted/15 p-3'
                : 'max-h-[min(60vh,400px)] overflow-y-auto p-3',
            )}
          >
            {effectiveRunnerId === 'caption-generator' && 'captions' in result
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
              : selectedTool.id === 'venus-cupid' && result && typeof result === 'object' && 'content' in result
                ? renderCupidResults(result as CupidArrowResult)
              : selectedTool.id === 'churn-predictor'
                ? renderChurnResults(result as AIResult)
                : selectedTool.id === 'income-predictor' &&
                    result &&
                    typeof result === 'object' &&
                    'ai' in result
                  ? renderIncomePredictorResults(result as IncomePredictorApiResult)
                  : renderGenericResults(result as AIResult)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
