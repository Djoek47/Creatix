'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import {
  Search,
  Zap,
  Lock,
  Crown,
  ArrowLeft,
  Wand2,
  PenTool,
  Target,
  Lightbulb,
  Camera,
  MessageSquare,
  Gift,
  Shield,
  Scroll,
  Music,
  Eye,
  Moon,
  MessagesSquare,
  ListTree,
  Calendar,
  TrendingUp,
  Sparkles,
  BarChart3,
  Info,
} from 'lucide-react'
import { ALL_TOOLS_META, type AIToolCategory } from '@/lib/ai-tools-data'
import { createClient } from '@/lib/supabase/client'
import { isPaidPlanId } from '@/lib/billing/access'
import { formatToolCreditCost } from '@/lib/billing/credit-economics'
import { DASHBOARD_CREDIT_SUMMARY_MARK } from '@/lib/dashboard-credit-summary-marker'
import { cn } from '@/lib/utils'

const ICON_MAP: Record<string, React.ElementType> = {
  'caption-generator': Wand2,
  'fantasy-writer': PenTool,
  'content-ideas': Lightbulb,
  'photo-enhancer': Camera,
  'ai-chatter': MessageSquare,
  commenter: MessagesSquare,
  housekeeping: ListTree,
  'gift-suggester': Gift,
  'whale-whisperer': Crown,
  'churn-predictor': Moon,
  'income-predictor': TrendingUp,
  'retention-tease': Calendar,
  'leak-scanner': Shield,
  'dmca-automator': Scroll,
  'voice-cloning': Music,
  'competitor-analysis': Eye,
  'circe-protection-shield': Shield,
  'venus-cupid': Target,
  'brand-uniformity': Sparkles,
  'credits-planner': BarChart3,
}

const CATEGORIES: { id: 'all' | AIToolCategory; name: string }[] = [
  { id: 'all', name: 'All' },
  { id: 'content', name: 'Content' },
  { id: 'engagement', name: 'Engage' },
  { id: 'analytics', name: 'Analytics' },
  { id: 'protection', name: 'Shield' },
  { id: 'premium', name: 'Premium' },
]

const TOOL_CARD_CLASS = cn(
  'relative h-full overflow-hidden rounded-xl border border-white/40 bg-white/50 py-0 shadow-[0_12px_36px_-18px_rgba(15,23,42,0.2)] backdrop-blur-2xl backdrop-saturate-150 transition-[border-color,box-shadow] duration-200 ease-out',
  'dark:border-white/[0.10] dark:bg-slate-950/45 dark:shadow-[0_16px_44px_-22px_rgba(0,0,0,0.48)]',
)

const TOOL_INFO_HOVER_CLASS = cn(
  'w-[min(calc(100vw-2rem),22rem)] rounded-2xl border border-white/45 bg-white/85 p-4 shadow-[0_24px_80px_-24px_rgba(15,23,42,0.3)] backdrop-blur-2xl backdrop-saturate-150',
  'dark:border-white/[0.10] dark:bg-slate-950/75 dark:shadow-[0_28px_90px_-28px_rgba(0,0,0,0.6)]',
)

interface AIToolsLibraryProps {
  showBackButton?: boolean
}

export function AIToolsLibrary({ showBackButton = false }: AIToolsLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<'all' | AIToolCategory>('all')
  const [creditSnapshot, setCreditSnapshot] = useState<{
    totalRemaining: number
    includedRemaining: number
    purchasedRemaining: number
  } | null>(null)
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
          .select(
            'ai_credits_used,ai_credits_limit,plan_id,billing_variant,revenue_tier,billing_focus_platform,billing_focus_platforms,billing_seats',
          )
          .eq('user_id', user.id)
          .maybeSingle()
        if (data) {
          const planId = (data as { plan_id?: string }).plan_id?.toLowerCase()
          setIsPro(!!planId && isPaidPlanId(planId))
        }

        const snapshotRes = await fetch('/api/billing/credit-snapshot', {
          method: 'GET',
          credentials: 'include',
        })
        if (snapshotRes.ok) {
          const snapshot = (await snapshotRes.json()) as {
            wallet?: {
              totalRemaining?: number
              includedRemaining?: number
              purchasedRemaining?: number
            }
          }
          const wallet = snapshot.wallet
          setCreditSnapshot({
            totalRemaining: Number(wallet?.totalRemaining ?? 0),
            includedRemaining: Number(wallet?.includedRemaining ?? 0),
            purchasedRemaining: Number(wallet?.purchasedRemaining ?? 0),
          })
        }
      } catch {
        // ignore
      }
    }
    load()
  }, [])

  const libraryTools = ALL_TOOLS_META.filter((t) => !t.hiddenFromLibrary)

  const filteredTools = libraryTools.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.longDescription.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeCategory === 'all' || tool.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const categoryCounts = CATEGORIES.map((c) => ({
    ...c,
    count:
      c.id === 'all'
        ? libraryTools.length
        : libraryTools.filter((t) => t.category === c.id).length,
  }))

  return (
    <div className="min-w-0 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {showBackButton ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl border border-border/35 bg-background/40 backdrop-blur-sm"
              asChild
            >
              <Link href="/dashboard/ai-studio" aria-label="Back to AI Studio">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
          ) : null}
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              placeholder="Search by name or topic…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 rounded-xl border-border/35 bg-background/45 pl-10 shadow-sm backdrop-blur-md transition-[border-color,box-shadow] duration-200 placeholder:text-muted-foreground/70 focus-visible:ring-1"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <div
            className="inline-flex items-center gap-2 rounded-full border border-border/35 bg-background/40 px-3 py-1.5 text-[13px] tabular-nums text-muted-foreground backdrop-blur-md"
            {...DASHBOARD_CREDIT_SUMMARY_MARK}
          >
            <Zap className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            {creditSnapshot ? (
              <span>
                <span className="font-medium text-foreground">{creditSnapshot.totalRemaining}</span> credits
              </span>
            ) : (
              <span>Credits</span>
            )}
          </div>
          {!isPro ? (
            <Button
              size="sm"
              className="h-9 gap-1.5 rounded-full bg-foreground px-4 font-medium text-background shadow-sm transition-opacity hover:opacity-90"
              asChild
            >
              <Link href="/dashboard/settings?tab=billing">
                <Crown className="h-3.5 w-3.5" aria-hidden />
                Upgrade
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as 'all' | AIToolCategory)}>
        <TabsList className="!flex !h-auto w-full flex-wrap gap-1 rounded-xl border border-border/30 bg-background/40 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md dark:bg-white/[0.04]">
          {categoryCounts.map((cat) => (
            <TabsTrigger
              key={cat.id}
              value={cat.id}
              className={cn(
                'rounded-lg px-3 py-2 text-[13px] font-medium transition-[background-color,box-shadow,color] duration-200 ease-out',
                'data-[state=active]:bg-background/88 data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/40',
                'data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/45',
              )}
            >
              {cat.name}
              <span className="ml-1.5 tabular-nums opacity-60">{cat.count}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-6 focus-visible:outline-none sm:mt-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filteredTools.map((tool) => {
              const Icon = ICON_MAP[tool.id] ?? Wand2
              const comingSoon = tool.comingSoon === true
              const href =
                comingSoon
                  ? ''
                  : tool.isPro && !isPro
                    ? '/dashboard/settings?tab=billing'
                    : tool.id === 'commenter'
                      ? '/dashboard/commenter'
                      : tool.id === 'housekeeping'
                        ? '/dashboard/commenter?section=housekeeping'
                        : tool.id === 'churn-predictor'
                          ? '/dashboard/retention/churn'
                          : tool.id === 'retention-tease'
                            ? '/dashboard/retention/churn#future-tease'
                            : `/dashboard/ai-studio/tools/${tool.id}`

              const toolInfoHover = (
                <HoverCard openDelay={160} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute bottom-2 right-2 z-10 h-8 w-8 rounded-full border border-border/40 bg-background/85 text-muted-foreground shadow-sm backdrop-blur-md transition-[background-color,color,box-shadow] duration-200 hover:bg-background hover:text-foreground"
                      aria-label={`What ${tool.name} does — hover or focus to read`}
                    >
                      <Info className="h-3.5 w-3.5" strokeWidth={2} />
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent align="end" side="top" sideOffset={8} className={TOOL_INFO_HOVER_CLASS}>
                    <p className="text-[15px] font-semibold leading-tight tracking-tight text-foreground">{tool.name}</p>
                    <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{tool.longDescription}</p>
                    {!comingSoon ? (
                      <p className="mt-4 border-t border-border/35 pt-3 text-[12px] text-muted-foreground">
                        <span className="font-medium text-foreground">Credits: </span>
                        {formatToolCreditCost(tool.id)}
                      </p>
                    ) : null}
                  </HoverCardContent>
                </HoverCard>
              )

              const cardInner = (
                <CardContent className="flex h-full min-h-0 flex-1 flex-col justify-center p-3 pb-11 sm:p-3.5 sm:pb-11">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/15 bg-gradient-to-br from-amber-500/15 to-purple-600/15 ring-1 ring-amber-500/10 backdrop-blur-sm transition-[background,box-shadow,filter] duration-300 ease-out',
                        'motion-safe:group-hover:from-pink-500/20 motion-safe:group-hover:via-amber-400/15 motion-safe:group-hover:to-cyan-500/15 motion-safe:group-hover:ring-purple-400/25',
                        tool.isPro && !comingSoon && 'ring-amber-500/20',
                      )}
                    >
                      <Icon className="ai-tools-lib-icon h-4 w-4 shrink-0" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 pr-8">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="ai-tools-lib-title text-[13px] font-semibold leading-snug">
                          {tool.name}
                        </h3>
                        {tool.badge && !comingSoon ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              'border-border/45 text-[10px] font-medium',
                              tool.badge.includes('Circe') && 'border-circe/30 text-circe',
                              tool.badge.includes('Venus') && 'border-amber-500/30 text-amber-700 dark:text-amber-300',
                              tool.badge === 'Agency' && 'border-border/50',
                            )}
                          >
                            {tool.badge}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:text-[12px]">
                        {tool.description}
                      </p>
                      {!comingSoon ? (
                        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Zap className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                          {formatToolCreditCost(tool.id)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {comingSoon ? (
                    <div className="absolute left-2 top-2 z-10">
                      <Badge
                        variant="outline"
                        className="border-border/45 px-1.5 text-[9px] font-medium text-muted-foreground"
                      >
                        Soon
                      </Badge>
                    </div>
                  ) : tool.isPro && !isPro ? (
                    <div className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border/40 bg-background/80 backdrop-blur-sm">
                      <Lock className="h-3 w-3 text-muted-foreground" aria-hidden />
                    </div>
                  ) : null}
                </CardContent>
              )

              return (
                <div key={tool.id} className="group relative h-full min-h-[6.5rem]">
                  {toolInfoHover}
                  {comingSoon ? (
                    <div className="block h-full cursor-not-allowed" aria-label={`${tool.name} — coming soon`}>
                      <Card
                        className={cn(
                          TOOL_CARD_CLASS,
                          'border-dashed border-border/50 bg-muted/15 opacity-[0.92] dark:bg-muted/10',
                        )}
                      >
                        {cardInner}
                      </Card>
                    </div>
                  ) : (
                    <Link
                      href={href}
                      className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <Card
                        className={cn(
                          TOOL_CARD_CLASS,
                          'hover:border-white/55 hover:shadow-[0_16px_44px_-18px_rgba(15,23,42,0.26)] dark:hover:border-white/[0.14]',
                          tool.isPro && !isPro && 'opacity-95',
                        )}
                      >
                        {cardInner}
                      </Card>
                    </Link>
                  )}
                </div>
              )
            })}
          </div>

          {filteredTools.length === 0 ? (
            <div
              className={cn(
                'mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/40 bg-background/30 px-6 py-16 text-center backdrop-blur-sm',
              )}
            >
              <Search className="mb-4 h-10 w-10 text-muted-foreground/60" aria-hidden />
              <p className="text-[15px] font-medium text-foreground">No tools match</p>
              <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                Try a different search or category.
              </p>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
