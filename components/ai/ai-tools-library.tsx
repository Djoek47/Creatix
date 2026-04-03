'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  Zap,
  Lock,
  Crown,
  ArrowLeft,
  Wand2,
  PenTool,
  Brain,
  Target,
  Lightbulb,
  Camera,
  MessageSquare,
  Gift,
  Flame,
  BarChart3,
  Shield,
  Scroll,
  Music,
  Video,
  Eye,
  Moon,
  Gem,
  Heart,
  Leaf,
  Compass,
  MessagesSquare,
} from 'lucide-react'
import { ALL_TOOLS_META, type AIToolCategory } from '@/lib/ai-tools-data'
import { createClient } from '@/lib/supabase/client'
import { isPaidPlanId } from '@/lib/billing/access'

const ICON_MAP: Record<string, React.ElementType> = {
  'caption-generator': Wand2,
  'fantasy-writer': PenTool,
  'content-ideas': Lightbulb,
  'photo-enhancer': Camera,
  'ai-chatter': MessageSquare,
  commenter: MessagesSquare,
  'mood-detector': Brain,
  'gift-suggester': Gift,
  'whale-whisperer': Crown,
  'price-optimizer': Target,
  'viral-predictor': Flame,
  'churn-predictor': BarChart3,
  'leak-scanner': Shield,
  'dmca-automator': Scroll,
  'voice-cloning': Music,
  'video-script-ai': Video,
  'competitor-analysis': Eye,
  'circe-oracle': Moon,
  'circe-transformation': Gem,
  'circe-protection-shield': Shield,
  'venus-attraction': Heart,
  'venus-cupid': Target,
  'venus-garden': Leaf,
  'divine-forecast': Compass,
  'standard-of-attraction': Heart,
}

const CATEGORIES: { id: 'all' | AIToolCategory; name: string }[] = [
  { id: 'all', name: 'All' },
  { id: 'content', name: 'Content' },
  { id: 'engagement', name: 'Engage' },
  { id: 'analytics', name: 'Analytics' },
  { id: 'protection', name: 'Shield' },
  { id: 'premium', name: 'Premium' },
]

interface AIToolsLibraryProps {
  showBackButton?: boolean
}

export function AIToolsLibrary({ showBackButton = false }: AIToolsLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<'all' | AIToolCategory>('all')
  const [credits, setCredits] = useState<{ used: number; limit: number } | null>(null)
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('subscriptions')
          .select('ai_credits_used,ai_credits_limit,plan_id')
          .eq('user_id', user.id)
          .maybeSingle()
        if (data) {
          setCredits({
            used: data.ai_credits_used ?? 0,
            limit: data.ai_credits_limit ?? 100,
          })
          const planId = (data as { plan_id?: string }).plan_id?.toLowerCase()
          setIsPro(!!planId && isPaidPlanId(planId))
        }
      } catch {
        // ignore
      }
    }
    load()
  }, [])

  const filteredTools = ALL_TOOLS_META.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeCategory === 'all' || tool.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const categoryCounts = CATEGORIES.map((c) => ({
    ...c,
    count: c.id === 'all' ? ALL_TOOLS_META.length : ALL_TOOLS_META.filter((t) => t.category === c.id).length,
  }))

  return (
    <div className="min-w-0 space-y-5">
      {showBackButton ? (
        <Button variant="ghost" size="icon" className="-ml-2 shrink-0" asChild>
          <Link href="/dashboard/ai-studio" aria-label="Back to AI Studio">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            placeholder="Search tools…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-border/60 bg-card/50 pl-9 backdrop-blur-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1 border-amber-500/25 bg-amber-500/[0.04] text-foreground">
            <Zap className="h-3 w-3 text-amber-500" aria-hidden />
            {credits
              ? `${credits.limit === 999999 ? '∞' : Math.max(0, credits.limit - credits.used)} left`
              : 'Credits'}
          </Badge>
          {!isPro ? (
            <Button size="sm" className="gap-1 bg-gradient-to-r from-amber-600 to-purple-600 text-white hover:from-amber-500 hover:to-purple-500" asChild>
              <Link href="/dashboard/settings?tab=billing#pricing-plans">
                <Crown className="h-4 w-4" aria-hidden />
                Pro
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as 'all' | AIToolCategory)}>
        <TabsList className="flex h-auto w-full flex-wrap gap-1.5 bg-transparent p-0">
          {categoryCounts.map((cat) => (
            <TabsTrigger
              key={cat.id}
              value={cat.id}
              className="rounded-full border border-transparent bg-muted/40 px-3 py-1.5 text-xs font-medium data-[state=active]:border-purple-500/30 data-[state=active]:bg-purple-500/10 data-[state=active]:text-foreground"
            >
              {cat.name}
              <span className="ml-1.5 tabular-nums opacity-60">{cat.count}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-5 focus-visible:outline-none">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTools.map((tool) => {
              const Icon = ICON_MAP[tool.id] ?? Wand2
              const href =
                tool.isPro && !isPro
                  ? '/dashboard/settings?tab=billing#pricing-plans'
                  : tool.id === 'commenter'
                    ? '/dashboard/commenter'
                    : `/dashboard/ai-studio/tools/${tool.id}`
              return (
                <Link key={tool.id} href={href} className="group block">
                  <Card
                    className={`relative h-full overflow-hidden border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(251,191,36,0.25),0_0_28px_-8px_rgba(168,85,247,0.35),0_12px_40px_-16px_rgba(0,0,0,0.2)] ${
                      tool.isPro ? 'border-amber-500/20 hover:border-amber-400/40' : 'border-border/70 hover:border-purple-500/35'
                    }`}
                  >
                    {tool.isPro && !isPro ? (
                      <div className="absolute right-2 top-2 z-10">
                        <Lock className="h-4 w-4 text-amber-500" aria-hidden />
                      </div>
                    ) : null}
                    <CardContent className="p-4 pt-5">
                      <div className="flex gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/15 to-purple-600/15 ring-1 ring-amber-500/10 transition-all duration-300 group-hover:from-pink-500/20 group-hover:via-amber-400/15 group-hover:to-cyan-500/15 group-hover:ring-purple-400/25">
                          <Icon className="ai-tools-lib-icon h-5 w-5" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="ai-tools-lib-title text-[15px] font-semibold leading-tight">{tool.name}</h3>
                            {tool.badge ? (
                              <Badge
                                variant="secondary"
                                className={`text-[10px] ${
                                  tool.badge.includes('Circe')
                                    ? 'bg-circe/20 text-circe-light'
                                    : tool.badge.includes('Venus')
                                      ? 'bg-venus/20 text-venus'
                                      : tool.badge === 'Agency'
                                        ? 'bg-gold/20 text-gold'
                                        : ''
                                }`}
                              >
                                {tool.badge}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">{tool.description}</p>
                          {tool.credits != null ? (
                            <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Zap className="h-3 w-3 shrink-0 text-amber-500/80" aria-hidden />
                              {tool.credits} credit{tool.credits !== 1 ? 's' : ''}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>

          {filteredTools.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
              <p className="text-sm font-medium text-foreground">Nothing matches</p>
              <p className="mt-1 text-xs text-muted-foreground">Try another search or category.</p>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
