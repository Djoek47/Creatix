'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Checkout } from '@/components/stripe/checkout'
import { PRODUCTS, PAID_TIER_FEATURES, getProduct } from '@/lib/products'
import {
  getSubscriptionStatus,
  createCustomerPortalSession,
  createCustomerPortalSessionForFlow,
} from '@/app/actions/stripe'
import { syncSubscriptionCreditsFromPlanAction } from '@/app/actions/subscription-credits'
import { createClient } from '@/lib/supabase/client'
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC } from '@/lib/platform-logos'
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
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  REVENUE_TIERS,
  getMonthlyPriceUsd,
  focusFanslyUsd,
  focusPlatformDisplayName,
  twoPlatformFocusUsd,
  type BillingVariant,
} from '@/lib/pricing-matrix'
import {
  ADULT_BILLING_PLATFORMS,
  sortFocusPlatforms,
  resolveAllowedFocusPlatforms,
  type AdultBillingPlatform,
} from '@/lib/billing/platform-variant'
import { PAID_PLAN_ID, isPaidPlanId, PROTECTION_PLAN_ID, TRIAL_PLAN_ID, isProtectionEntitled } from '@/lib/billing/access'
import { effectiveMonthlyCreditLimit, TRIAL_AI_CREDITS_LIMIT } from '@/lib/billing/credit-economics'
import { cn } from '@/lib/utils'
import { PricingPageCalculator } from '@/components/marketing/pricing-page-calculator'

const BILLING_GLASS =
  'rounded-2xl border border-white/45 bg-white/55 py-0 shadow-[0_18px_50px_-26px_rgba(15,23,42,0.2)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/[0.10] dark:bg-slate-950/48 dark:shadow-[0_22px_62px_-30px_rgba(0,0,0,0.52)]'

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
  protection_plan_active?: boolean | null
  protection_stripe_subscription_id?: string | null
}

type WalletSnapshot = {
  includedRemaining: number
  purchasedRemaining: number
  totalRemaining: number
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
  const router = useRouter()
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
  const [checkoutQuoteVariant, setCheckoutQuoteVariant] = useState<BillingVariant>('single')
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null)
  const [creditPulse, setCreditPulse] = useState<'consume' | 'grant' | null>(null)
  const [customTopupAmount, setCustomTopupAmount] = useState<string>('20')
  const [paymentState, setPaymentState] = useState<'idle' | 'processing' | 'success' | 'pending'>('idle')
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [manualRefreshing, setManualRefreshing] = useState(false)
  const [creditTopCategories, setCreditTopCategories] = useState<Array<{ reason: string; amount: number }>>([])
  const [creditTimeline, setCreditTimeline] = useState<CreditTimelineRow[]>([])
  const prevTotalRef = useRef<number | null>(null)
  const supabase = createClient()
  const loadSubscriptionData = useCallback(async (): Promise<WalletSnapshot | null> => {
    if (!userId) return null

    await syncSubscriptionCreditsFromPlanAction()

    const { data } = await supabase.from('subscriptions').select('*').eq('user_id', userId).single()

    if (data) {
      setSubData(data as SubscriptionData)
      const row = data as SubscriptionData
      if (typeof row.revenue_tier === 'number' && row.revenue_tier >= 0 && row.revenue_tier <= 10) {
        setCheckoutTierIndex(row.revenue_tier)
      }
      if (row.billing_variant === 'multi') {
        setCheckoutQuoteVariant('multi')
        setPlatformSelection(new Set<AdultBillingPlatform>(['onlyfans', 'fansly']))
      } else if (row.billing_variant === 'single') {
        setCheckoutQuoteVariant('single')
        const allowed = resolveAllowedFocusPlatforms(row.billing_focus_platforms, row.billing_focus_platform)
        setPlatformSelection(new Set(allowed))
      } else {
        setCheckoutQuoteVariant('single')
        setPlatformSelection(new Set(['onlyfans']))
      }
    } else {
      // Do not bootstrap trial credits client-side. Trial credits are only activated
      // by Stripe webhook after card setup (status becomes "trialing").
      setSubData(null)
    }

    let walletSnap: WalletSnapshot | null = null
    try {
      const snapshotRes = await fetch('/api/billing/credit-snapshot', {
        method: 'GET',
        credentials: 'include',
      })
      if (snapshotRes.ok) {
        const snapshot = (await snapshotRes.json()) as {
          wallet?: {
            includedRemaining?: number
            purchasedRemaining?: number
            totalRemaining?: number
          }
        }
        walletSnap = {
          includedRemaining: Number(snapshot.wallet?.includedRemaining ?? 0),
          purchasedRemaining: Number(snapshot.wallet?.purchasedRemaining ?? 0),
          totalRemaining: Number(snapshot.wallet?.totalRemaining ?? 0),
        }
        if (prevTotalRef.current != null && walletSnap) {
          if (walletSnap.totalRemaining < prevTotalRef.current) setCreditPulse('consume')
          if (walletSnap.totalRemaining > prevTotalRef.current) setCreditPulse('grant')
        }
        if (walletSnap) {
          prevTotalRef.current = walletSnap.totalRemaining
          setWallet(walletSnap)
        }
      }
    } catch {
      // ignore snapshot errors
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
    setLastSyncedAt(new Date())
    return walletSnap
  }, [userId, supabase])

  const handleForceRefresh = useCallback(async () => {
    setManualRefreshing(true)
    try {
      await loadSubscriptionData()
      setPaymentState('idle')
      setPaymentMessage(null)
    } finally {
      setManualRefreshing(false)
    }
  }, [loadSubscriptionData])

  const handleCheckoutComplete = useCallback(async () => {
    const previousTotal = wallet?.totalRemaining ?? prevTotalRef.current ?? 0
    setPaymentState('processing')
    setPaymentMessage('Payment confirmed. Syncing your latest credits...')

    const waitsMs = [800, 1200, 1800, 2600, 3500]
    let updated = false
    for (const waitMs of waitsMs) {
      await new Promise((resolve) => window.setTimeout(resolve, waitMs))
      const latestWallet = await loadSubscriptionData()
      if (latestWallet && latestWallet.totalRemaining !== previousTotal) {
        updated = true
        break
      }
    }

    router.refresh()
    await loadSubscriptionData()
    if (updated) {
      setPaymentState('success')
      setPaymentMessage('Payment successful — your credits are now updated.')
    } else {
      setPaymentState('pending')
      setPaymentMessage('Payment is confirmed. Final reconciliation is in progress and will update shortly.')
    }
  }, [loadSubscriptionData, router, wallet?.totalRemaining])

  useEffect(() => {
    if (!creditPulse) return
    const id = window.setTimeout(() => setCreditPulse(null), 1000)
    return () => window.clearTimeout(id)
  }, [creditPulse])

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

  useEffect(() => {
    if (checkoutQuoteVariant !== 'multi') return
    setPlatformSelection(new Set<AdultBillingPlatform>(['onlyfans', 'fansly']))
  }, [checkoutQuoteVariant])

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
      if (n.size >= 2) return n
      n.add(p)
      return n
    })
  }

  const sortedSelection = useMemo(
    () => sortFocusPlatforms([...platformSelection]),
    [platformSelection],
  )
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
      ? getMonthlyPriceUsd('single', checkoutTierIndex, focusCheckoutList)
      : 0
  const unifiedCheckoutUsd = tierRow?.multiPriceUsd ?? 0

  const seatMultiplier =
    typeof subData?.billing_seats === 'number' && subData.billing_seats >= 1 ? subData.billing_seats : 1

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
    () => (subData ? effectiveMonthlyCreditLimit(subData) : 0),
    [subData],
  )
  const statusValue = String(subData?.status ?? subscription?.status ?? '').toLowerCase()
  const creditsEligible = statusValue === 'active' || statusValue === 'trialing'
  const trialActivated = statusValue === 'trialing' && (subData?.plan_id ?? subscription?.planId) === TRIAL_PLAN_ID
  const trialPendingCard =
    (subData?.plan_id ?? subscription?.planId) === TRIAL_PLAN_ID && !trialActivated
  const visibleCreditsRemaining = creditsEligible
    ? (wallet?.totalRemaining ?? Math.max(0, aiCreditsLimit - aiCreditsUsed))
    : 0
  const storageUsedGB = (subData?.storage_used_mb || 0) / 1000
  const storageLimitGB = (subData?.storage_limit_mb || 5000) / 1000
  const dbPeriodEnd = subData?.current_period_end ? new Date(subData.current_period_end) : null
  const statusPeriodEnd = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null
  const effectivePeriodEnd = dbPeriodEnd || statusPeriodEnd
  const daysRemaining = effectivePeriodEnd
    ? Math.max(0, Math.ceil((effectivePeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 14
  const customTopupUsd = Number.parseInt(customTopupAmount, 10)
  const customTopupValid = Number.isFinite(customTopupUsd) && customTopupUsd >= 20
  const lastSyncedLabel = lastSyncedAt
    ? `${lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
    : 'Not synced yet'

  if (loading) {
    return (
      <Card className={BILLING_GLASS}>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={BILLING_GLASS}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[1.0625rem] font-semibold tracking-tight">
            <CreditCard className="h-5 w-5 opacity-70" />
            Plan & billing
          </CardTitle>
          <CardDescription>Current subscription, credits, and quick actions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border border-border/35 bg-background/35 p-5 backdrop-blur-sm sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <Badge variant="outline" className="mb-2 border-border/50 text-[10px] font-medium uppercase tracking-wider">
                  {paidActive ? 'Active' : 'Trial / free'}
                </Badge>
                <h3 className="text-lg font-semibold tracking-tight">{currentPlan?.name || 'Divine Trial'}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {paidActive
                    ? `Renews ${subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'soon'}`
                    : `Trial ends ${subData?.trial_ends_at ? new Date(subData.trial_ends_at).toLocaleDateString() : 'soon'}`}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-2xl font-semibold tabular-nums tracking-tight">
                  {paidActive ? `$${subscribedMonthlyUsd ?? 0}` : `$${currentPlan?.priceMonthly ?? 0}`}
                </p>
                <p className="text-sm text-muted-foreground">per month</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                onClick={handleManageBilling}
                disabled={loadingPortal}
                variant="outline"
                className="rounded-xl border-border/40"
              >
                {loadingPortal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Stripe customer portal
              </Button>

              {paidActive ? (
                <>
                  <Button
                    onClick={() => openPortalFlow('payment_method_update')}
                    disabled={loadingPortal}
                    variant="outline"
                    className="rounded-xl border-border/40"
                  >
                    Payment method
                  </Button>
                  {!subData?.cancel_at_period_end && (
                    <Button
                      onClick={() => openPortalFlow('subscription_cancel')}
                      disabled={loadingPortal}
                      variant="ghost"
                      className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      Cancel plan
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  variant="default"
                  className="rounded-xl bg-foreground text-background hover:opacity-90"
                  onClick={() =>
                    document.getElementById('revenue-pricing')?.scrollIntoView({ behavior: 'smooth' })
                  }
                >
                  View plans
                </Button>
              )}
            </div>
            {paidActive && (
              <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                To change revenue band, Focus platforms, or Bundled vs Focus, use the checkout blocks below. The portal
                handles cards, invoices, and cancellation.
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border/35 bg-background/30 p-4 text-center backdrop-blur-sm">
              <Calendar className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Period</p>
              <p className="text-xl font-semibold tabular-nums">{daysRemaining}</p>
              <p className="text-[11px] text-muted-foreground">
                {subData?.cancel_at_period_end ? 'days until end' : 'days left'}
              </p>
            </div>
            <div
              className={cn(
                'rounded-xl border border-border/35 bg-background/30 p-4 text-center backdrop-blur-sm transition-[box-shadow,border-color] duration-300',
                creditPulse === 'consume' && 'border-amber-500/35 shadow-[0_0_20px_-8px_rgba(250,204,21,0.35)]',
                creditPulse === 'grant' && 'border-violet-500/35 shadow-[0_0_20px_-8px_rgba(167,139,250,0.35)]',
              )}
            >
              <Zap className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">AI credits</p>
              <p className="text-xl font-semibold tabular-nums">{visibleCreditsRemaining}</p>
              <p className="text-[11px] text-muted-foreground">
                {wallet?.includedRemaining ?? 0} incl. · {wallet?.purchasedRemaining ?? 0} purchased
              </p>
              {trialActivated ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Trial pool: {TRIAL_AI_CREDITS_LIMIT} credits (card verified).
                </p>
              ) : null}
              {trialPendingCard ? (
                <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-200/90">
                  Credits activate after card setup in Stripe.
                </p>
              ) : null}
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                100 credits per $1. Included monthly pool follows your plan; tools debit by estimated provider cost.
              </p>
              <Progress
                value={
                  aiCreditsLimit > 0 ? Math.min(100, (aiCreditsUsed / aiCreditsLimit) * 100) : 0
                }
                className="mt-2 h-1"
              />
            </div>
            <div className="rounded-xl border border-border/35 bg-background/30 p-4 text-center backdrop-blur-sm">
              <Database className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Storage</p>
              <p className="text-xl font-semibold tabular-nums">
                {storageUsedGB.toFixed(1)} / {storageLimitGB}
              </p>
              <Progress value={(storageUsedGB / storageLimitGB) * 100} className="mt-2 h-1" />
            </div>
            <div className="rounded-xl border border-border/35 bg-background/30 p-4 text-center backdrop-blur-sm">
              <Mail className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Messages</p>
              <p className="text-xl font-semibold tabular-nums">{messagesThisMonth.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">this month (est.)</p>
            </div>
          </div>

          {subData?.cancel_at_period_end && (
            <div className="flex flex-col gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-4 backdrop-blur-sm sm:flex-row sm:items-center">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Subscription ending</p>
                <p className="text-sm text-muted-foreground">
                  Access continues through{' '}
                  {subData.current_period_end
                    ? new Date(subData.current_period_end).toLocaleDateString()
                    : 'the end of the period'}
                  .
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 rounded-xl border-border/40"
                onClick={() => openPortalFlow('subscription_update')}
                disabled={loadingPortal}
              >
                Resume billing
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {paymentState !== 'idle' && paymentMessage ? (
        <Card
          className={cn(
            BILLING_GLASS,
            'billing-card-enter overflow-hidden border-amber-500/20 bg-amber-500/[0.06] dark:bg-amber-500/[0.08]',
          )}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {paymentState === 'success'
                    ? 'Payment complete'
                    : paymentState === 'pending'
                      ? 'Payment recorded'
                      : 'Finalizing'}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{paymentMessage}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 rounded-xl border-border/40"
                onClick={() => void handleForceRefresh()}
              >
                {manualRefreshing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                Refresh balance
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/35 bg-background/35 px-3 py-2.5 text-[12px] backdrop-blur-sm">
        <p className="text-muted-foreground">
          Wallet updated <span className="font-medium text-foreground">{lastSyncedLabel}</span>
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-lg text-muted-foreground hover:text-foreground"
          onClick={() => void handleForceRefresh()}
          disabled={manualRefreshing}
        >
          {manualRefreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Sync
        </Button>
      </div>

      <Card className={BILLING_GLASS}>
        <CardHeader>
          <CardTitle className="font-semibold">Top Up Credits</CardTitle>
          <CardDescription>
            Fast top-ups for peak demand. Purchased credits roll one extra month.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Checkout
              productId="credit-topup-2000"
              buttonText="500 credits · $5"
              buttonClassName="billing-topup-button w-full rounded-xl bg-foreground font-medium text-background shadow-sm transition-opacity hover:opacity-90"
              onComplete={handleCheckoutComplete}
            />
            <Checkout
              productId="credit-topup-5000"
              buttonText="1,000 credits · $10"
              buttonClassName="billing-topup-button w-full rounded-xl bg-foreground font-medium text-background shadow-sm transition-opacity hover:opacity-90"
              onComplete={handleCheckoutComplete}
            />
            <Checkout
              productId="credit-topup-10000"
              buttonText="2,000 credits · $20"
              buttonClassName="billing-topup-button w-full rounded-xl bg-foreground font-medium text-background shadow-sm transition-opacity hover:opacity-90"
              onComplete={handleCheckoutComplete}
            />
          </div>
          <div className="rounded-xl border border-border/35 bg-background/30 p-4 backdrop-blur-sm">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_1fr] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="custom-topup">Custom amount</Label>
                <Input
                  id="custom-topup"
                  type="number"
                  min={5}
                  step={1}
                  value={customTopupAmount}
                  onChange={(e) => setCustomTopupAmount(e.target.value)}
                  onBlur={(e) => {
                    const v = Number.parseInt(e.target.value, 10)
                    if (Number.isFinite(v) && v < 5) setCustomTopupAmount('5')
                  }}
                  className="bg-background/70"
                  placeholder="20"
                />
                <p className="text-xs text-muted-foreground">Minimum $20 for checkout (100 credits per $1)</p>
              </div>
              <Checkout
                productId="credit-topup-custom"
                customTopupUsdAmount={customTopupUsd}
                disabled={!customTopupValid}
                buttonText={
                  customTopupValid
                    ? `Buy custom · $${customTopupUsd} · ${(customTopupUsd * 100).toLocaleString()} credits`
                    : 'Enter at least $20'
                }
                buttonClassName="billing-topup-button w-full rounded-xl bg-foreground font-medium text-background shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                onComplete={handleCheckoutComplete}
              />
            </div>
          </div>
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-border/35 bg-background/25 p-3 backdrop-blur-sm sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium">Credits planner</p>
              <p className="text-xs text-muted-foreground">Day-by-day planning lives on the dashboard.</p>
            </div>
            <Button asChild variant="outline" className="gap-1.5 rounded-xl border-border/40">
              <Link href="/dashboard/credits-planner">
                Open planner
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className={BILLING_GLASS}>
        <CardHeader>
          <CardTitle className="font-semibold">Credit Usage</CardTitle>
          <CardDescription>Where credits are going right now.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-border/35 bg-background/25 p-3 text-sm backdrop-blur-sm">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Top debit reasons</p>
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
          <div className="rounded-xl border border-border/35 bg-background/25 p-3 text-sm backdrop-blur-sm">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Recent ledger</p>
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

      <Card id="revenue-pricing" className={BILLING_GLASS}>
        <CardHeader>
          <CardTitle className="font-semibold">Plans &amp; pricing</CardTitle>
          <CardDescription>
            Same estimate as <Link href="/pricing" className="text-primary underline-offset-4 hover:underline">public pricing</Link>
            . Choose checkout below when you are ready—tiers match Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <PricingPageCalculator
            surface="settings"
            controlled={{
              tierIndex: checkoutTierIndex,
              onTierIndexChange: setCheckoutTierIndex,
              variant: checkoutQuoteVariant,
              onVariantChange: (v) => {
                setCheckoutQuoteVariant(v)
                if (v === 'multi') setPlatformSelection(new Set<AdultBillingPlatform>(['onlyfans', 'fansly']))
              },
              platformSelection,
              togglePlatform,
              setPlatformSelection,
            }}
          />

          <div className="flex flex-col gap-2 border-t border-border/30 pt-6 sm:flex-row sm:items-center sm:gap-4">
            <span className="text-xs text-muted-foreground">Legacy Focus</span>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={platformSelection.has('manyvids')}
                onCheckedChange={() => {
                  setCheckoutQuoteVariant('single')
                  togglePlatform('manyvids')
                }}
                aria-label="ManyVids"
              />
              <span className="font-medium">{focusPlatformDisplayName('manyvids')}</span>
              <Badge variant="outline" className="text-[10px]">
                {PLATFORM_BADGE.manyvids}
              </Badge>
            </label>
            <p className="text-xs text-muted-foreground sm:ml-auto sm:max-w-md">
              Bundled above is OnlyFans + Fansly only. ManyVids uses banded pair pricing from the matrix.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-1">
            <div
              className={cn(
                'rounded-2xl border border-border/40 bg-background/40 p-6 shadow-sm backdrop-blur-md transition-[box-shadow,ring]',
                checkoutQuoteVariant === 'single' && 'ring-1 ring-border/50',
              )}
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Focus · 1–2 platforms
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">Focus</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Pro tools for the platforms you select (up to two).
              </p>

              <p className="mt-5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
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
                  disabled={!focusCheckoutList}
                  onComplete={handleCheckoutComplete}
                  buttonText={
                    paidActive
                      ? `Checkout Focus — $${focusCheckoutUsd}/mo`
                      : `Subscribe — Focus — $${focusCheckoutUsd}/mo`
                  }
                  buttonVariant="default"
                  buttonClassName="w-full rounded-xl bg-foreground font-medium text-background shadow-sm hover:opacity-90"
                />
              </div>
            </div>

            <div
              className={cn(
                'relative rounded-2xl border border-white/12 bg-slate-950/55 p-6 pt-7 text-foreground shadow-[0_20px_50px_-28px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-[box-shadow,ring] dark:bg-slate-950/65',
                checkoutQuoteVariant === 'multi' && 'ring-1 ring-white/20',
              )}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="outline" className="border-white/20 bg-background/80 px-3 text-[10px] font-medium text-foreground backdrop-blur-sm">
                  OnlyFans + Fansly
                </Badge>
              </div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Bundled</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight">Bundled</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Both platforms in one monthly price for your revenue band.
              </p>

              <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-9 min-w-[4.5rem] max-w-[5.5rem] items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/30 px-0.5">
                    <Image
                      src={ONLYFANS_LOGO_SRC}
                      alt="OnlyFans"
                      width={100}
                      height={22}
                      className="h-5 w-auto max-w-full object-contain object-left"
                    />
                  </span>
                  <span className="flex h-9 min-w-[3.5rem] max-w-[4.5rem] items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/30 px-0.5">
                    <Image
                      src={FANSLY_LOGO_SRC}
                      alt="Fansly"
                      width={88}
                      height={22}
                      className="h-5 w-auto max-w-full object-contain object-left"
                    />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Two platforms</p>
                  <p className="text-[11px] text-muted-foreground">Priced from the band matrix — not a simple add-on.</p>
                </div>
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.06]"
                  aria-hidden
                >
                  <Check className="h-4 w-4 text-foreground/80" />
                </div>
              </div>

              <p className="mt-5 text-2xl font-semibold tabular-nums tracking-tight">
                ${unifiedCheckoutUsd}
                <span className="text-base font-normal text-muted-foreground">/mo</span>
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {PAID_TIER_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Checkout
                  productId={PAID_PLAN_ID}
                  billingVariant="multi"
                  tierIndex={checkoutTierIndex}
                  onComplete={handleCheckoutComplete}
                  buttonText={
                    paidActive
                      ? `Checkout Bundled — $${unifiedCheckoutUsd}/mo`
                      : `Subscribe — Bundled — $${unifiedCheckoutUsd}/mo`
                  }
                  buttonVariant="default"
                  buttonClassName="w-full rounded-xl border border-white/20 bg-white/90 font-medium text-slate-950 shadow-sm hover:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/35 bg-background/20 backdrop-blur-sm">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-background/40">
                  <th className="p-3 text-left font-medium">Revenue</th>
                  <th className="p-3 text-right font-medium">OnlyFans</th>
                  <th className="p-3 text-right font-medium">Fansly</th>
                  <th className="p-3 text-right font-medium">Bundled (OnlyFans + Fansly)</th>
                </tr>
              </thead>
              <tbody>
                {REVENUE_TIERS.map((row) => (
                  <tr
                    key={row.tierIndex}
                    className={
                      row.tierIndex === checkoutTierIndex
                        ? 'bg-foreground/[0.04]'
                        : 'border-b border-border/40'
                    }
                  >
                    <td className="p-3">{row.label}</td>
                    <td className="p-3 text-right tabular-nums">${row.focusBaseUsd}</td>
                    <td className="p-3 text-right tabular-nums">${focusFanslyUsd(row)}</td>
                    <td className="p-3 text-right tabular-nums">
                      ${twoPlatformFocusUsd(row, 'onlyfans', 'fansly')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className={BILLING_GLASS} id="protection-plan">
        <CardHeader>
          <CardTitle className="font-semibold">
            {getProduct(PROTECTION_PLAN_ID)?.name ?? 'Protection & Anti-Piracy'}
          </CardTitle>
          <CardDescription>
            {getProduct(PROTECTION_PLAN_ID)?.description}
            {subData && isProtectionEntitled(subData) ? (
              <span className="mt-2 block text-emerald-600 dark:text-emerald-400">Active on your account.</span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-2xl font-bold tabular-nums">
            ${(getProduct(PROTECTION_PLAN_ID)?.priceMonthly ?? 25).toFixed(0)}
            <span className="text-base font-normal text-muted-foreground">/mo</span>
          </p>
          <Checkout
            productId={PROTECTION_PLAN_ID}
            buttonText={
              subData && isProtectionEntitled(subData)
                ? 'Update payment (Protection active)'
                : `Subscribe — Protection — $${getProduct(PROTECTION_PLAN_ID)?.priceMonthly ?? 25}/mo`
            }
            onComplete={handleCheckoutComplete}
            buttonVariant="secondary"
            buttonClassName="w-full"
          />
        </CardContent>
      </Card>

      <Card className={BILLING_GLASS}>
        <CardHeader>
          <CardTitle className="font-semibold">Trial</CardTitle>
          <CardDescription>
            Card-required trial: add your payment method first, then your trial credits become active.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/35 bg-background/25 p-4 backdrop-blur-sm">
            <Sparkles className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1">
              <h4 className="font-semibold">{PRODUCTS[0]?.name}</h4>
              <p className="text-sm text-muted-foreground">{PRODUCTS[0]?.description}</p>
            </div>
            <Badge variant="outline">$0</Badge>
          </div>
          <div className="mt-4">
            <Checkout
              productId={TRIAL_PLAN_ID}
              onComplete={handleCheckoutComplete}
              buttonText="Start free trial (card required)"
              buttonClassName="w-full"
              disabled={trialActivated}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Trial starts after card setup in Stripe. By starting, you authorize automatic billing after the trial
              period unless canceled before renewal.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className={BILLING_GLASS}>
        <CardHeader>
          <CardTitle className="font-semibold">Invoices</CardTitle>
          <CardDescription>Open invoice history in Stripe.</CardDescription>
        </CardHeader>
        <CardContent>
          {paidActive ? (
            <Button
              variant="outline"
              className="rounded-xl border-border/40"
              onClick={handleManageBilling}
              disabled={loadingPortal}
            >
              {loadingPortal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Open invoices
            </Button>
          ) : (
            <p className="py-8 text-center text-muted-foreground">No invoices yet</p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
