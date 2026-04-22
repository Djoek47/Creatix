'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Checkout } from '@/components/stripe/checkout'
import { PRODUCTS, PAID_TIER_FEATURES } from '@/lib/products'
import {
  getSubscriptionStatus,
  createCustomerPortalSession,
  createCustomerPortalSessionForFlow,
} from '@/app/actions/stripe'
import { syncSubscriptionCreditsFromPlanAction } from '@/app/actions/subscription-credits'
import { createClient } from '@/lib/supabase/client'
import {
  CreditCard,
  Zap,
  Database,
  Mail,
  Check,
  Loader2,
  Sparkles,
  Calendar,
  AlertTriangle,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  REVENUE_TIERS,
  getMonthlyPriceUsd,
  focusFanslyUsd,
  focusPlatformDisplayName,
  twoPlatformFocusUsd,
  MANYVIDS_FOCUS_SINGLE_FLAT_USD,
  type BillingVariant,
} from '@/lib/pricing-matrix'
import { BUNDLE_ADDONS } from '@/lib/circe-venus-pricing'
import { DEFAULT_BILLING_SEATS, MAX_BILLING_SEATS } from '@/lib/billing/seats'
import {
  ADULT_BILLING_PLATFORMS,
  sortFocusPlatforms,
  resolveAllowedFocusPlatforms,
  type AdultBillingPlatform,
} from '@/lib/billing/platform-variant'
import { PAID_PLAN_ID, isPaidPlanId } from '@/lib/billing/access'
import { effectiveMonthlyCreditLimit } from '@/lib/billing/credit-economics'
import { cn } from '@/lib/utils'
import type { CreditPlanPriority } from '@/lib/billing/credit-planner'

interface BillingSectionProps {
  userId?: string
  userEmail?: string
}

interface SubscriptionData {
  id: string
  plan_id: string
  status: string
  ai_credits_used: number
  ai_credits_limit: number
  storage_used_mb: number
  storage_limit_mb: number
  current_period_end: string
  cancel_at_period_end: boolean
  trial_ends_at?: string | null
  billing_variant?: string | null
  billing_focus_platform?: string | null
  billing_focus_platforms?: string[] | null
  revenue_tier?: number | null
  revenue_band_label?: string | null
  stripe_customer_id?: string | null
  billing_seats?: number | null
}

type WalletSnapshot = {
  includedRemaining: number
  purchasedRemaining: number
  totalRemaining: number
}

type PlannerResult = {
  allocations: Array<{
    category: CreditPlanPriority
    credits: number
    percent: number
    estimatedActions: number
  }>
  projectedMonthlySpend: number
  estimatedDaysToDepletion: number
  safeModeSuggestion: string | null
}

type CreditTimelineRow = {
  id: string
  kind: 'debit' | 'credit' | 'expire_adjustment'
  amount: number
  reason_code: string
  created_at: string
}

const PLATFORM_BADGE: Record<AdultBillingPlatform, string> = {
  onlyfans: 'Base',
  fansly: '≤$200',
  manyvids: 'Solo $39',
}

export function BillingSection({ userId }: BillingSectionProps) {
  const [subscription, setSubscription] = useState<{
    status: string
    plan: string | null
    planId?: string | null
    currentPeriodEnd?: string
    cancelAtPeriodEnd?: boolean
    billingVariant?: BillingVariant | null
    revenueTier?: number | null
  } | null>(null)
  const [subData, setSubData] = useState<SubscriptionData | null>(null)
  const [messagesThisMonth, setMessagesThisMonth] = useState<number>(0)
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [platformSelection, setPlatformSelection] = useState<Set<AdultBillingPlatform>>(
    () => new Set(['onlyfans']),
  )
  const [checkoutTierIndex, setCheckoutTierIndex] = useState(4)
  const [checkoutSeats, setCheckoutSeats] = useState(DEFAULT_BILLING_SEATS)
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null)
  const [creditPulse, setCreditPulse] = useState<'consume' | 'grant' | null>(null)
  const [plannerLoading, setPlannerLoading] = useState(false)
  const [plannerResult, setPlannerResult] = useState<PlannerResult | null>(null)
  const [creatorSize, setCreatorSize] = useState<'solo' | 'small_team' | 'agency'>('solo')
  const [priorities, setPriorities] = useState<Set<CreditPlanPriority>>(new Set(['dm_growth']))
  const [targetMessages, setTargetMessages] = useState(1200)
  const [targetLeakScans, setTargetLeakScans] = useState(12)
  const [targetReputationScans, setTargetReputationScans] = useState(8)
  const [targetChatTurns, setTargetChatTurns] = useState(800)
  const [creditTopCategories, setCreditTopCategories] = useState<Array<{ reason: string; amount: number }>>([])
  const [creditTimeline, setCreditTimeline] = useState<CreditTimelineRow[]>([])
  const prevTotalRef = useRef<number | null>(null)
  const supabase = createClient()

  const loadSubscriptionData = useCallback(async () => {
    if (!userId) return

    await syncSubscriptionCreditsFromPlanAction()

    const { data } = await supabase.from('subscriptions').select('*').eq('user_id', userId).single()

    if (data) {
      setSubData(data as SubscriptionData)
      const row = data as SubscriptionData
      if (typeof row.revenue_tier === 'number' && row.revenue_tier >= 0 && row.revenue_tier <= 10) {
        setCheckoutTierIndex(row.revenue_tier)
      }
      const bs = (row as SubscriptionData).billing_seats
      if (typeof bs === 'number' && bs >= 1) setCheckoutSeats(Math.min(MAX_BILLING_SEATS, bs))
      if (row.billing_variant === 'multi') {
        setPlatformSelection(new Set(ADULT_BILLING_PLATFORMS))
      } else if (row.billing_variant === 'single') {
        const allowed = resolveAllowedFocusPlatforms(row.billing_focus_platforms, row.billing_focus_platform)
        setPlatformSelection(new Set(allowed))
      } else {
        setPlatformSelection(new Set(['onlyfans']))
      }
    } else {
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      const { data: newSub } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_id: 'divine-trial',
          status: 'trial',
          ai_credits_used: 0,
          ai_credits_limit: 100,
          storage_used_mb: 0,
          storage_limit_mb: 5000,
          trial_ends_at: trialEnd,
          current_period_end: trialEnd,
        })
        .select()
        .single()

      if (newSub) setSubData(newSub as SubscriptionData)
    }

    try {
      const { data: walletRow } = await supabase
        .from('credit_wallets')
        .select('included_credits_remaining,purchased_credits_remaining')
        .eq('user_id', userId)
        .maybeSingle()
      const walletSnap: WalletSnapshot = {
        includedRemaining: Number(walletRow?.included_credits_remaining ?? 0),
        purchasedRemaining: Number(walletRow?.purchased_credits_remaining ?? 0),
        totalRemaining:
          Number(walletRow?.included_credits_remaining ?? 0) +
          Number(walletRow?.purchased_credits_remaining ?? 0),
      }
      if (prevTotalRef.current != null) {
        if (walletSnap.totalRemaining < prevTotalRef.current) setCreditPulse('consume')
        if (walletSnap.totalRemaining > prevTotalRef.current) setCreditPulse('grant')
      }
      prevTotalRef.current = walletSnap.totalRemaining
      setWallet(walletSnap)
    } catch {
      // table may not exist yet in local env
    }

    try {
      const { data: txRows } = await supabase
        .from('credit_transactions')
        .select('id,kind,amount,reason_code,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(40)

      const timeline = (txRows ?? []) as CreditTimelineRow[]
      setCreditTimeline(timeline.slice(0, 10))
      const debitTotals = new Map<string, number>()
      for (const row of timeline) {
        if (row.kind !== 'debit') continue
        debitTotals.set(row.reason_code, (debitTotals.get(row.reason_code) ?? 0) + Number(row.amount ?? 0))
      }
      const top = [...debitTotals.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([reason, amount]) => ({ reason, amount }))
      setCreditTopCategories(top)
    } catch {
      setCreditTopCategories([])
      setCreditTimeline([])
    }

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: analyticsRows } = await supabase
      .from('analytics_snapshots')
      .select('messages_received,messages_sent,date,platform')
      .eq('user_id', userId)
      .gte('date', startOfMonth.toISOString().split('T')[0])

    const totalMessages =
      analyticsRows?.reduce((sum, r: { messages_received?: number; messages_sent?: number }) => {
        return sum + (r.messages_received || 0) + (r.messages_sent || 0)
      }, 0) || 0
    setMessagesThisMonth(totalMessages)
  }, [userId, supabase])

  useEffect(() => {
    if (!creditPulse) return
    const id = window.setTimeout(() => setCreditPulse(null), 1000)
    return () => window.clearTimeout(id)
  }, [creditPulse])

  const runCreditPlanner = async () => {
    setPlannerLoading(true)
    try {
      const res = await fetch('/api/billing/credit-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyCreditsAvailable: wallet?.totalRemaining ?? aiCreditsLimit - aiCreditsUsed,
          creatorSize,
          priorities: [...priorities],
          targetActivityVolume: {
            messages: targetMessages,
            leakScans: targetLeakScans,
            reputationScans: targetReputationScans,
            chatTurns: targetChatTurns,
          },
        }),
      })
      const data = await res.json()
      if (res.ok) setPlannerResult(data.plan as PlannerResult)
    } finally {
      setPlannerLoading(false)
    }
  }

  useEffect(() => {
    async function loadSubscription() {
      try {
        const status = await getSubscriptionStatus()
        setSubscription(status)
        await loadSubscriptionData()
      } catch (error) {
        console.error('Failed to load subscription:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSubscription()
  }, [loadSubscriptionData])

  const handleManageBilling = async () => {
    setLoadingPortal(true)
    try {
      const url = await createCustomerPortalSession()
      window.location.href = url
    } catch (error) {
      console.error('Failed to create portal session:', error)
    } finally {
      setLoadingPortal(false)
    }
  }

  const openPortalFlow = async (
    flow: 'payment_method_update' | 'subscription_cancel' | 'subscription_update',
  ) => {
    setLoadingPortal(true)
    try {
      const url = await createCustomerPortalSessionForFlow(flow)
      window.location.href = url
    } catch (error) {
      console.error('Failed to create portal session:', error)
      try {
        const url = await createCustomerPortalSession()
        window.location.href = url
      } catch {
        // ignore
      }
    } finally {
      setLoadingPortal(false)
    }
  }

  const togglePlatform = (p: AdultBillingPlatform) => {
    setPlatformSelection((prev) => {
      const n = new Set(prev)
      if (n.has(p)) {
        if (n.size <= 1) return n
        n.delete(p)
        return n
      }
      n.add(p)
      return n
    })
  }

  const sortedSelection = useMemo(
    () => sortFocusPlatforms([...platformSelection]),
    [platformSelection],
  )
  const isUnifiedSelection = sortedSelection.length === 3
  const focusCheckoutList =
    sortedSelection.length >= 1 && sortedSelection.length <= 2 ? sortedSelection : null

  const planId = subscription?.planId || subData?.plan_id
  const paidActive =
    isPaidPlanId(planId) &&
    (subscription?.status === 'active' ||
      subscription?.status === 'trialing' ||
      subData?.status === 'active' ||
      subData?.status === 'trialing')

  const tierRow = REVENUE_TIERS.find((t) => t.tierIndex === checkoutTierIndex)
  const focusCheckoutUsd =
    tierRow && focusCheckoutList
      ? getMonthlyPriceUsd('single', checkoutTierIndex, focusCheckoutList) * checkoutSeats
      : 0
  const unifiedCheckoutUsd = (tierRow?.multiPriceUsd ?? 0) * checkoutSeats

  const seatMultiplier =
    typeof subData?.billing_seats === 'number' && subData.billing_seats >= 1
      ? subData.billing_seats
      : DEFAULT_BILLING_SEATS

  const subscribedMonthlyUsd =
    paidActive && subData
      ? getMonthlyPriceUsd(
          (subData.billing_variant as BillingVariant) || 'single',
          typeof subData.revenue_tier === 'number' ? subData.revenue_tier : 4,
          subData.billing_variant === 'multi'
            ? undefined
            : resolveAllowedFocusPlatforms(subData.billing_focus_platforms, subData.billing_focus_platform),
        ) * seatMultiplier
      : null

  const currentPlan = subscription?.plan
    ? {
        name: subscription.plan,
        priceMonthly: paidActive ? subscribedMonthlyUsd ?? 0 : 0,
      }
    : { name: PRODUCTS.find((p) => p.id === 'divine-trial')?.name || 'Divine Trial', priceMonthly: 0 }

  const aiCreditsUsed = subData?.ai_credits_used || 0
  const aiCreditsLimit = useMemo(
    () => (subData ? effectiveMonthlyCreditLimit(subData) : 100),
    [subData],
  )
  const storageUsedGB = (subData?.storage_used_mb || 0) / 1000
  const storageLimitGB = (subData?.storage_limit_mb || 5000) / 1000
  const dbPeriodEnd = subData?.current_period_end ? new Date(subData.current_period_end) : null
  const statusPeriodEnd = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null
  const effectivePeriodEnd = dbPeriodEnd || statusPeriodEnd
  const daysRemaining = effectivePeriodEnd
    ? Math.max(0, Math.ceil((effectivePeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 14

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-semibold">Credit Usage Visibility</CardTitle>
          <CardDescription>Top debit categories and latest wallet ledger activity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border p-3 text-sm">
            <p className="mb-2 font-medium">Top 5 debit categories this month</p>
            {creditTopCategories.length === 0 ? (
              <p className="text-muted-foreground">No debit activity yet.</p>
            ) : (
              creditTopCategories.map((row) => (
                <p key={row.reason}>
                  {row.reason}: {row.amount} credits
                </p>
              ))
            )}
          </div>
          <div className="rounded-lg border border-border p-3 text-sm">
            <p className="mb-2 font-medium">Where credits went (timeline)</p>
            {creditTimeline.length === 0 ? (
              <p className="text-muted-foreground">No transactions yet.</p>
            ) : (
              creditTimeline.map((row) => (
                <p key={row.id}>
                  {new Date(row.created_at).toLocaleDateString()} · {row.kind} · {row.reason_code} ·{' '}
                  {row.amount} credits
                </p>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-semibold">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <Badge className="mb-2 bg-primary/20 text-primary">
                  {paidActive ? 'ACTIVE' : 'FREE TRIAL'}
                </Badge>
                <h3 className="text-xl font-semibold">{currentPlan?.name || 'Divine Trial'}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {paidActive
                    ? `Renews ${subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'soon'}`
                    : `Trial ends ${subData?.trial_ends_at ? new Date(subData.trial_ends_at).toLocaleDateString() : 'soon'}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">
                  {paidActive ? `$${subscribedMonthlyUsd ?? 0}` : `$${currentPlan?.priceMonthly ?? 0}`}
                </p>
                <p className="text-sm text-muted-foreground">/month</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={handleManageBilling} disabled={loadingPortal} variant="outline">
                {loadingPortal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Open Stripe Billing Portal
              </Button>

              {paidActive ? (
                <>
                  <Button
                    onClick={() => openPortalFlow('payment_method_update')}
                    disabled={loadingPortal}
                    variant="outline"
                  >
                    Update Payment Method
                  </Button>
                  {!subData?.cancel_at_period_end && (
                    <Button
                      onClick={() => openPortalFlow('subscription_cancel')}
                      disabled={loadingPortal}
                      variant="destructive"
                    >
                      Cancel Subscription
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() =>
                      document.getElementById('revenue-pricing')?.scrollIntoView({ behavior: 'smooth' })
                    }
                  >
                    Choose plan & subscribe
                  </Button>
                </>
              )}
            </div>
            {paidActive && (
              <p className="mt-3 text-xs text-muted-foreground">
                To change band, Focus platforms, or Unified, use checkout below (new session) or cancel and
                resubscribe. The Stripe portal may not list every dynamic price.
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-border p-4 text-center">
              <Calendar className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-2 font-medium">Days Remaining</p>
              <p className="text-2xl font-bold">{daysRemaining}</p>
              <p className="text-sm text-muted-foreground">
                {subData?.cancel_at_period_end ? 'until cancelled' : 'in period'}
              </p>
            </div>
            <div
              className={cn(
                'rounded-lg border border-border p-4 text-center transition-all',
                creditPulse === 'consume' &&
                  'border-amber-500/60 bg-amber-500/10 shadow-[0_0_24px_rgba(250,204,21,0.25)]',
                creditPulse === 'grant' &&
                  'border-violet-500/60 bg-violet-500/10 shadow-[0_0_24px_rgba(167,139,250,0.28)]',
              )}
            >
              <Zap className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-2 font-medium">AI Credits</p>
              <p className="text-2xl font-bold">
                {wallet?.totalRemaining ?? Math.max(0, aiCreditsLimit - aiCreditsUsed)} remaining
              </p>
              <p className="text-xs text-muted-foreground">
                Included: {wallet?.includedRemaining ?? 0} · Purchased: {wallet?.purchasedRemaining ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">
                $1 = 100 credits ($0.01 each). Monthly pool ≈ 20% of your subscription (USD), e.g. $100/mo →
                ~2,000 credits. Each tool debits based on estimated provider cost.
              </p>
              <Progress
                value={
                  aiCreditsLimit > 0 ? Math.min(100, (aiCreditsUsed / aiCreditsLimit) * 100) : 0
                }
                className="mt-2 h-1"
              />
            </div>
            <div className="rounded-lg border border-border p-4 text-center">
              <Database className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-2 font-medium">Storage</p>
              <p className="text-2xl font-bold">
                {storageUsedGB.toFixed(1)}/{storageLimitGB}
              </p>
              <Progress value={(storageUsedGB / storageLimitGB) * 100} className="mt-2 h-1" />
            </div>
            <div className="rounded-lg border border-border p-4 text-center">
              <Mail className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-2 font-medium">Messages</p>
              <p className="text-2xl font-bold">{messagesThisMonth.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">this month</p>
            </div>
          </div>

          {subData?.cancel_at_period_end && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div className="flex-1">
                <p className="font-medium text-amber-500">Subscription Canceling</p>
                <p className="text-sm text-muted-foreground">
                  Your subscription will end on{' '}
                  {subData.current_period_end
                    ? new Date(subData.current_period_end).toLocaleDateString()
                    : 'soon'}
                  . You&apos;ll lose access to Pro features after this date.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openPortalFlow('subscription_update')}
                disabled={loadingPortal}
              >
                Resume
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-semibold">Buy More Credits</CardTitle>
          <CardDescription>
            Fixed packs via Stripe. Purchased credits roll for one extra billing month.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Checkout productId="credit-topup-2000" buttonText="Buy 2,000 · $20" buttonClassName="w-full" />
          <Checkout productId="credit-topup-5000" buttonText="Buy 5,000 · $50" buttonClassName="w-full" />
          <Checkout productId="credit-topup-10000" buttonText="Buy 10,000 · $100" buttonClassName="w-full" />
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-semibold">Credit Allocation Planner</CardTitle>
          <CardDescription>
            Plan this month by priorities (DM growth, DMCA, reputation, chat) and target volumes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Creator size</Label>
              <Select value={creatorSize} onValueChange={(v) => setCreatorSize(v as typeof creatorSize)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solo">Solo</SelectItem>
                  <SelectItem value="small_team">Small team</SelectItem>
                  <SelectItem value="agency">Agency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority focus</Label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {(['dm_growth', 'dmca', 'reputation', 'chat_support'] as CreditPlanPriority[]).map((p) => (
                  <label key={p} className="flex items-center gap-2">
                    <Checkbox
                      checked={priorities.has(p)}
                      onCheckedChange={() =>
                        setPriorities((prev) => {
                          const next = new Set(prev)
                          if (next.has(p)) next.delete(p)
                          else next.add(p)
                          return next
                        })
                      }
                    />
                    <span>{p.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label>Messages</Label>
              <input
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                type="number"
                value={targetMessages}
                onChange={(e) => setTargetMessages(Number(e.target.value || 0))}
              />
            </div>
            <div className="space-y-1">
              <Label>Leak scans</Label>
              <input
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                type="number"
                value={targetLeakScans}
                onChange={(e) => setTargetLeakScans(Number(e.target.value || 0))}
              />
            </div>
            <div className="space-y-1">
              <Label>Reputation scans</Label>
              <input
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                type="number"
                value={targetReputationScans}
                onChange={(e) => setTargetReputationScans(Number(e.target.value || 0))}
              />
            </div>
            <div className="space-y-1">
              <Label>Chat turns</Label>
              <input
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                type="number"
                value={targetChatTurns}
                onChange={(e) => setTargetChatTurns(Number(e.target.value || 0))}
              />
            </div>
          </div>
          <Button onClick={runCreditPlanner} disabled={plannerLoading}>
            {plannerLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Build monthly plan
          </Button>
          {plannerResult && (
            <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">
                Projected depletion: {plannerResult.estimatedDaysToDepletion} days · Planned spend:{' '}
                {plannerResult.projectedMonthlySpend} credits
              </p>
              {plannerResult.allocations.map((row) => (
                <p key={row.category}>
                  {row.category.replace('_', ' ')}: {row.credits} credits ({row.percent}%) ~{' '}
                  {row.estimatedActions} actions
                </p>
              ))}
              {plannerResult.safeModeSuggestion ? (
                <p className="text-amber-600 dark:text-amber-400">{plannerResult.safeModeSuggestion}</p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card id="revenue-pricing" className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-semibold">Plans & pricing</CardTitle>
          <CardDescription>
            Choose your <strong>revenue band</strong>. <strong>Focus</strong>: OnlyFans uses the tier base;
            Fansly line is ~10% below base, <strong>capped at $200/mo</strong>; ManyVids <strong>solo</strong> is{' '}
            <strong>$39/mo</strong> (any tier). Two-platform Focus uses fixed bundle prices (OF+FL, OF+MV, FL+MV).
            Pick <strong>all three</strong> for <strong>Unified</strong> (OF base + $25 for your band).{' '}
            <strong>Seats</strong> = managers on the same creator account (price × seats). Connected OnlyFans /
            Fansly earnings may adjust your band on the next invoice (see pricing FAQ).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-2 max-w-md flex-1">
              <Label>Monthly revenue band</Label>
              <Select
                value={String(checkoutTierIndex)}
                onValueChange={(v) => setCheckoutTierIndex(Number.parseInt(v, 10))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REVENUE_TIERS.map((t) => (
                    <SelectItem key={t.tierIndex} value={String(t.tierIndex)}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full max-w-[12rem]">
              <Label>Seats (managers)</Label>
              <Select
                value={String(checkoutSeats)}
                onValueChange={(v) => setCheckoutSeats(Math.min(MAX_BILLING_SEATS, Math.max(1, Number.parseInt(v, 10))))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: MAX_BILLING_SEATS }, (_, i) => i + 1).map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} seat{n === 1 ? '' : 's'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-sm font-medium text-foreground">Platforms for this quote</p>
          <div className="flex flex-wrap gap-4">
            {ADULT_BILLING_PLATFORMS.map((p) => (
              <label
                key={p}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                  platformSelection.has(p)
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-border hover:bg-muted/40',
                )}
              >
                <Checkbox
                  checked={platformSelection.has(p)}
                  onCheckedChange={() => togglePlatform(p)}
                  aria-label={focusPlatformDisplayName(p)}
                />
                <span className="font-medium">{focusPlatformDisplayName(p)}</span>
                <Badge variant="outline" className="text-[10px]">
                  {PLATFORM_BADGE[p]}
                </Badge>
              </label>
            ))}
          </div>
          {isUnifiedSelection ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              All three selected — use <strong>Unified</strong> checkout for this price tier.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select 1–2 for Focus. Two-platform pricing uses fixed bundles: OF+FL (+$
              {BUNDLE_ADDONS.FL_ON_OF} on OF base), OF+MV (+${BUNDLE_ADDONS.MV_ON_OF} on OF base), or FL+MV (+$
              {BUNDLE_ADDONS.MV_ON_FL} on Fansly line).
            </p>
          )}

          <div className="grid gap-6 lg:grid-cols-1">
            <div
              className={cn(
                'rounded-xl border-2 p-6 shadow-sm',
                'border-amber-500/35 bg-amber-50/40 dark:border-amber-500/25 dark:bg-amber-950/15',
                isUnifiedSelection && 'opacity-60',
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                1–2 platforms
              </p>
              <h3 className="mt-1 font-serif text-2xl font-semibold text-foreground">Focus plan</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Full Pro tools for the platforms you selected (up to two).
              </p>

              <p className="mt-4 text-2xl font-bold text-foreground">
                ${focusCheckoutUsd}
                <span className="text-base font-normal text-muted-foreground">/mo</span>
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {PAID_TIER_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Checkout
                  productId={PAID_PLAN_ID}
                  billingVariant="single"
                  tierIndex={checkoutTierIndex}
                  focusPlatforms={focusCheckoutList ?? undefined}
                  seats={checkoutSeats}
                  disabled={!focusCheckoutList}
                  buttonText={
                    paidActive
                      ? `Checkout Focus — $${focusCheckoutUsd}/mo`
                      : `Subscribe — Focus — $${focusCheckoutUsd}/mo`
                  }
                  buttonVariant="default"
                  buttonClassName="w-full border-2 border-amber-600/50 bg-transparent text-amber-900 hover:bg-amber-500/10 dark:border-amber-500/50 dark:text-amber-100"
                />
              </div>
            </div>

            <div
              className={cn(
                'relative rounded-xl border-2 p-6 pt-8 shadow-md',
                'border-amber-500/40 bg-zinc-950 text-zinc-100 dark:bg-zinc-950',
                !isUnifiedSelection && 'ring-1 ring-dashed ring-amber-500/30',
              )}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="border-amber-500/60 bg-amber-600/90 px-3 text-xs font-semibold text-white">
                  All three
                </Badge>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/90">Unified</p>
              <h3 className="mt-1 font-serif text-2xl font-semibold text-white">Unified plan</h3>
              <p className="mt-1 text-sm text-zinc-400">OnlyFans, Fansly, ManyVids in one workspace.</p>

              <div className="mt-4 flex items-center gap-3 rounded-lg border border-amber-500/35 bg-zinc-900/80 p-4">
                <div className="flex -space-x-2">
                  <span className="flex size-9 items-center justify-center rounded-full border-2 border-zinc-950 bg-[#00AFF0] text-[10px] font-bold text-white">
                    OF
                  </span>
                  <span className="flex size-9 items-center justify-center rounded-full border-2 border-zinc-950 bg-[#009FFF] text-[10px] font-bold text-white">
                    FL
                  </span>
                  <span className="flex size-9 items-center justify-center rounded-full border-2 border-zinc-950 bg-[#E91E63] text-[10px] font-bold text-white">
                    MV
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-amber-200">Full bundle</p>
                  <p className="text-xs text-zinc-500">Original multi-platform price per band</p>
                </div>
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded border border-amber-500/60 bg-amber-500/20"
                  aria-hidden
                >
                  <Check className="h-4 w-4 text-amber-300" />
                </div>
              </div>

              <p className="mt-4 text-2xl font-bold text-white">
                ${unifiedCheckoutUsd}
                <span className="text-base font-normal text-zinc-400">/mo</span>
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {PAID_TIER_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Checkout
                  productId={PAID_PLAN_ID}
                  billingVariant="multi"
                  tierIndex={checkoutTierIndex}
                  seats={checkoutSeats}
                  buttonText={
                    paidActive
                      ? `Checkout Unified — $${unifiedCheckoutUsd}/mo`
                      : `Subscribe — Unified — $${unifiedCheckoutUsd}/mo`
                  }
                  buttonVariant="default"
                  buttonClassName="w-full bg-amber-600 text-white hover:bg-amber-600/90"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="p-3 text-left font-medium">Revenue</th>
                  <th className="p-3 text-right font-medium">OF base</th>
                  <th className="p-3 text-right font-medium">Fansly</th>
                  <th className="p-3 text-right font-medium">ManyVids</th>
                  <th className="p-3 text-right font-medium">×2 (OF+FL)</th>
                  <th className="p-3 text-right font-medium">Unified</th>
                </tr>
              </thead>
              <tbody>
                {REVENUE_TIERS.map((row) => (
                  <tr
                    key={row.tierIndex}
                    className={
                      row.tierIndex === checkoutTierIndex ? 'bg-primary/5' : 'border-b border-border/60'
                    }
                  >
                    <td className="p-3">{row.label}</td>
                    <td className="p-3 text-right tabular-nums">${row.focusBaseUsd}</td>
                    <td className="p-3 text-right tabular-nums">${focusFanslyUsd(row)}</td>
                    <td className="p-3 text-right tabular-nums">${MANYVIDS_FOCUS_SINGLE_FLAT_USD}</td>
                    <td className="p-3 text-right tabular-nums">
                      ${twoPlatformFocusUsd(row, 'onlyfans', 'fansly')}
                    </td>
                    <td className="p-3 text-right tabular-nums">${row.multiPriceUsd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-semibold">Free trial</CardTitle>
          <CardDescription>Start with limited usage; upgrade anytime above.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border p-4">
            <Sparkles className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1">
              <h4 className="font-semibold">{PRODUCTS[0]?.name}</h4>
              <p className="text-sm text-muted-foreground">{PRODUCTS[0]?.description}</p>
            </div>
            <Badge variant="outline">$0</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-semibold">Billing History</CardTitle>
          <CardDescription>View your past invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {paidActive ? (
            <Button variant="outline" onClick={handleManageBilling} disabled={loadingPortal}>
              {loadingPortal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              View Invoices in Stripe Portal
            </Button>
          ) : (
            <p className="py-8 text-center text-muted-foreground">No invoices yet</p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
