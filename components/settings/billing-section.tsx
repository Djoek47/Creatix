'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Checkout } from '@/components/stripe/checkout'
import { PRODUCTS, getProduct } from '@/lib/products'
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
  Loader2,
  Sparkles,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ChevronDown,
  RefreshCw,
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
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
  resolveAllowedFocusPlatforms,
  type AdultBillingPlatform,
} from '@/lib/billing/platform-variant'
import { isPaidPlanId, PROTECTION_PLAN_ID, TRIAL_PLAN_ID, isProtectionEntitled, hasActiveDivineTrial } from '@/lib/billing/access'
import { effectiveMonthlyCreditLimit, TRIAL_AI_CREDITS_LIMIT } from '@/lib/billing/credit-economics'
import { APP_USER_STORAGE_LIMIT_MB } from '@/lib/billing/app-storage-cap'
import { DASHBOARD_CREDIT_SUMMARY_MARK } from '@/lib/dashboard-credit-summary-marker'
import { cn } from '@/lib/utils'
import { PricingPageCalculator } from '@/components/marketing/pricing-page-calculator'

const BILLING_GLASS =
  'rounded-2xl border border-white/45 bg-white/55 py-0 shadow-[0_18px_50px_-26px_rgba(15,23,42,0.2)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/[0.10] dark:bg-slate-950/48 dark:shadow-[0_22px_62px_-30px_rgba(0,0,0,0.52)]'

/** Glass cards use `py-0`; extra top inset keeps titles off the rounded edge. */
const BILLING_CARD_HEADER = 'space-y-2 px-6 pb-6 pt-10 sm:px-8 sm:pt-11'

/** Multi-line friendly: `billing-topup` sheen + default `Button` nowrap/fixed height clip labels in narrow columns. */
const BILLING_TOPUP_BTN =
  'billing-topup-button relative z-[1] h-auto min-h-10 w-full max-w-full whitespace-normal px-3 py-2.5 text-balance leading-snug sm:min-h-11 sm:py-3 rounded-xl bg-foreground font-medium text-background shadow-sm transition-opacity hover:opacity-90'

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

const PLATFORM_BADGE: Record<AdultBillingPlatform, string> = {
  onlyfans: 'Base',
  fansly: '≤$200',
  manyvids: 'Solo $39',
}

type VaultBillingStorageSnapshot = {
  quotaMb: number
  usageBytes: number
  trace?: { kind: string; limited: boolean; quotaSource: string }
}

function formatStorageUsageMbDisplay(mb: number): string {
  if (!Number.isFinite(mb) || mb <= 0) return '0'
  if (mb < 1) return mb.toFixed(2)
  if (mb < 10) return mb.toFixed(1)
  return Math.round(mb).toLocaleString()
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
  const [vaultStorage, setVaultStorage] = useState<VaultBillingStorageSnapshot | null>(null)
  const [creditPulse, setCreditPulse] = useState<'consume' | 'grant' | null>(null)
  const [customTopupAmount, setCustomTopupAmount] = useState<string>('20')
  const [paymentState, setPaymentState] = useState<'idle' | 'processing' | 'success' | 'pending'>('idle')
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [manualRefreshing, setManualRefreshing] = useState(false)
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
      const sqRes = await fetch('/api/billing/storage-quota', { credentials: 'include' })
      if (sqRes.ok) {
        const sq = (await sqRes.json()) as {
          quotaMb?: number
          usageBytes?: number
          trace?: { kind: string; limited: boolean; quotaSource: string }
        }
        const q = Number(sq.quotaMb)
        const ub = Number(sq.usageBytes)
        if (Number.isFinite(q) && q > 0 && Number.isFinite(ub) && ub >= 0) {
          setVaultStorage({ quotaMb: q, usageBytes: ub, trace: sq.trace })
        } else {
          setVaultStorage(null)
        }
      } else {
        setVaultStorage(null)
      }
    } catch {
      setVaultStorage(null)
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

  const planId = subscription?.planId || subData?.plan_id
  const paidActive =
    isPaidPlanId(planId) &&
    (subscription?.status === 'active' ||
      subscription?.status === 'trialing' ||
      subData?.status === 'active' ||
      subData?.status === 'trialing')

  const divineTrialLive = hasActiveDivineTrial({
    plan_id: subData?.plan_id ?? subscription?.planId,
    status: subData?.status ?? subscription?.status,
  })
  const showTrialStartCard = !paidActive && !divineTrialLive

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
  const trialPendingCard =
    (subData?.plan_id ?? subscription?.planId) === TRIAL_PLAN_ID && !divineTrialLive
  const visibleCreditsRemaining = creditsEligible
    ? (wallet?.totalRemaining ?? Math.max(0, aiCreditsLimit - aiCreditsUsed))
    : 0
  const storageUsedMb = vaultStorage
    ? vaultStorage.usageBytes / (1024 * 1024)
    : Math.max(0, subData?.storage_used_mb ?? 0)
  const rawStorageLimitMb = subData?.storage_limit_mb
  const storageLimitMb =
    vaultStorage != null
      ? vaultStorage.quotaMb
      : rawStorageLimitMb == null || rawStorageLimitMb <= 0
        ? APP_USER_STORAGE_LIMIT_MB
        : Math.min(rawStorageLimitMb, APP_USER_STORAGE_LIMIT_MB)
  const storageProgressPct =
    storageLimitMb > 0 ? Math.min(100, (storageUsedMb / storageLimitMb) * 100) : 0
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
        <CardHeader className={BILLING_CARD_HEADER}>
          <CardTitle className="flex items-center gap-2 text-[1.0625rem] font-semibold tracking-tight">
            <CreditCard className="h-5 w-5 opacity-70" />
            Plan & billing
          </CardTitle>
          <CardDescription>Current subscription, credits, and quick actions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border border-border/30 bg-background/35 p-6 backdrop-blur-sm sm:p-7">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
              <div className="min-w-0 flex-1 space-y-1.5">
                <h3 className="text-[1.125rem] font-semibold leading-snug tracking-tight text-pretty text-foreground">
                  {currentPlan?.name || 'Divine Trial'}
                </h3>
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {paidActive ? (
                    <>
                      <span className="text-foreground/75">Active</span>
                      <span className="mx-1.5 text-border">·</span>
                      Renews{' '}
                      {subscription?.currentPeriodEnd
                        ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                        : 'soon'}
                    </>
                  ) : subData?.trial_ends_at ? (
                    <>
                      <span className="text-foreground/75">Trial</span>
                      <span className="mx-1.5 text-border">·</span>
                      Ends {new Date(subData.trial_ends_at).toLocaleDateString()}
                    </>
                  ) : (
                    <>
                      <span className="text-foreground/75">Free</span>
                      <span className="mx-1.5 text-border">·</span>
                      View plans below
                    </>
                  )}
                </p>
              </div>
              <div className="shrink-0 sm:pt-0.5 sm:text-right">
                <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                  {paidActive ? `$${subscribedMonthlyUsd ?? 0}` : `$${currentPlan?.priceMonthly ?? 0}`}
                </p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">per month</p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {paidActive ? (
                <>
                  <Button
                    onClick={handleManageBilling}
                    disabled={loadingPortal}
                    className="h-11 w-full rounded-xl bg-foreground text-background font-medium shadow-none hover:opacity-[0.92] sm:w-auto sm:min-w-[13.5rem]"
                  >
                    {loadingPortal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Manage billing
                  </Button>
                  <div className="flex flex-wrap items-baseline gap-x-1 gap-y-2 text-[13px]">
                    <Button
                      type="button"
                      variant="link"
                      disabled={loadingPortal}
                      onClick={() => void openPortalFlow('payment_method_update')}
                      className="h-auto p-0 font-normal text-muted-foreground underline-offset-4 hover:text-foreground"
                    >
                      Payment method
                    </Button>
                    {!subData?.cancel_at_period_end ? (
                      <>
                        <span className="select-none px-1 text-muted-foreground/40" aria-hidden>
                          ·
                        </span>
                        <Button
                          type="button"
                          variant="link"
                          disabled={loadingPortal}
                          onClick={() => void openPortalFlow('subscription_cancel')}
                          className="h-auto p-0 font-normal text-destructive/85 underline-offset-4 hover:text-destructive"
                        >
                          Cancel subscription
                        </Button>
                      </>
                    ) : null}
                  </div>
                </>
              ) : (
                <Button
                  variant="default"
                  className="h-11 w-full rounded-xl bg-foreground text-background font-medium shadow-none hover:opacity-[0.92] sm:w-auto sm:min-w-[13.5rem]"
                  onClick={() =>
                    document.getElementById('revenue-pricing')?.scrollIntoView({ behavior: 'smooth' })
                  }
                >
                  View plans
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 min-[480px]:gap-4 xl:grid-cols-4">
            <div className="min-w-0 rounded-xl border border-border/35 bg-background/30 p-4 text-center backdrop-blur-sm sm:p-5">
              <Calendar className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Period</p>
              <p className="text-xl font-semibold tabular-nums">{daysRemaining}</p>
              <p className="text-xs text-muted-foreground">
                {subData?.cancel_at_period_end ? 'days until end' : 'days left'}
              </p>
            </div>
            <div
              className={cn(
                'min-w-0 rounded-xl border border-border/35 bg-background/30 p-4 text-center backdrop-blur-sm transition-[box-shadow,border-color] duration-300 sm:p-5',
                creditPulse === 'consume' && 'border-amber-500/35 shadow-[0_0_20px_-8px_rgba(250,204,21,0.35)]',
                creditPulse === 'grant' && 'border-violet-500/35 shadow-[0_0_20px_-8px_rgba(167,139,250,0.35)]',
              )}
              {...DASHBOARD_CREDIT_SUMMARY_MARK}
            >
              <Zap className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">AI credits</p>
              <p className="text-xl font-semibold tabular-nums">{visibleCreditsRemaining.toLocaleString()}</p>
              <div className="mx-auto mt-2 max-w-[16rem] space-y-2 text-left text-xs leading-snug text-muted-foreground sm:max-w-none sm:text-center">
                <p className="tabular-nums sm:whitespace-normal">
                  <span className="text-foreground/90">{(wallet?.includedRemaining ?? 0).toLocaleString()}</span> included
                  <span className="text-muted-foreground/80"> · </span>
                  <span className="text-foreground/90">{(wallet?.purchasedRemaining ?? 0).toLocaleString()}</span>{' '}
                  purchased
                </p>
                {divineTrialLive ? (
                  <p className="text-xs text-muted-foreground">
                    Trial pool: {TRIAL_AI_CREDITS_LIMIT.toLocaleString()} credits (card verified).
                  </p>
                ) : null}
                {trialPendingCard ? (
                  <p className="text-xs text-amber-700 dark:text-amber-200/90">
                    Credits activate after card setup in Stripe.
                  </p>
                ) : null}
                <p className="text-xs leading-relaxed text-muted-foreground">
                  100 credits per $1. Included pool matches your plan; tools debit by estimated provider cost.
                </p>
              </div>
              <Progress
                value={
                  aiCreditsLimit > 0 ? Math.min(100, (aiCreditsUsed / aiCreditsLimit) * 100) : 0
                }
                className="mt-3 h-1"
              />
            </div>
            <div
              className="min-w-0 rounded-xl border border-border/35 bg-background/30 p-4 text-center backdrop-blur-sm sm:p-5"
              data-storage-policy={vaultStorage?.trace?.kind ?? 'subscription_fallback'}
              data-storage-quota-source={vaultStorage?.trace?.quotaSource ?? 'client_default'}
              data-storage-limited="true"
              title={
                vaultStorage?.trace
                  ? `Creatix vault: ${vaultStorage.quotaMb} MB cap (${vaultStorage.trace.quotaSource}). Usage from Supabase Storage.`
                  : `Storage cap: ${storageLimitMb} MB. Connect to load live usage from the vault.`
              }
            >
              <Database className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Storage</p>
              <p className="mt-1 text-lg font-semibold tabular-nums leading-snug sm:text-xl">
                {storageLimitMb < 1024 ? (
                  <>
                    <span className="block min-w-0 [overflow-wrap:anywhere] sm:inline">
                      {formatStorageUsageMbDisplay(storageUsedMb)} MB
                    </span>
                    <span className="text-muted-foreground"> / </span>
                    <span className="tabular-nums">{storageLimitMb.toLocaleString()} MB</span>
                  </>
                ) : (
                  <>
                    <span className="block min-w-0 [overflow-wrap:anywhere] sm:inline">
                      {(storageUsedMb / 1000).toFixed(2)} GB
                    </span>
                    <span className="text-muted-foreground"> / </span>
                    <span className="tabular-nums">{(storageLimitMb / 1000).toFixed(2)} GB</span>
                  </>
                )}
              </p>
              <Progress value={storageProgressPct} className="mt-2 h-1" />
            </div>
            <div className="min-w-0 rounded-xl border border-border/35 bg-background/30 p-4 text-center backdrop-blur-sm sm:p-5">
              <Mail className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Messages</p>
              <p className="text-xl font-semibold tabular-nums">{messagesThisMonth.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">this month (est.)</p>
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
        <CardHeader className={BILLING_CARD_HEADER}>
          <CardTitle className="font-semibold">Top Up Credits</CardTitle>
          <CardDescription>
            Fast top-ups for peak demand. Purchased credits roll one extra month.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-3">
            <Checkout
              productId="credit-topup-2000"
              buttonText={
                <>
                  <span className="block leading-tight">500 credits</span>
                  <span className="mt-0.5 block text-xs font-normal opacity-90">$5</span>
                </>
              }
              buttonClassName={BILLING_TOPUP_BTN}
              onComplete={handleCheckoutComplete}
            />
            <Checkout
              productId="credit-topup-5000"
              buttonText={
                <>
                  <span className="block leading-tight">1,000 credits</span>
                  <span className="mt-0.5 block text-xs font-normal opacity-90">$10</span>
                </>
              }
              buttonClassName={BILLING_TOPUP_BTN}
              onComplete={handleCheckoutComplete}
            />
            <Checkout
              productId="credit-topup-10000"
              buttonText={
                <>
                  <span className="block leading-tight">2,000 credits</span>
                  <span className="mt-0.5 block text-xs font-normal opacity-90">$20</span>
                </>
              }
              buttonClassName={BILLING_TOPUP_BTN}
              onComplete={handleCheckoutComplete}
            />
          </div>
          <div className="rounded-xl border border-border/35 bg-background/30 p-4 backdrop-blur-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-4">
              <div className="min-w-0 shrink-0 space-y-2 lg:w-48 xl:w-52">
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
              <div className="min-w-0 flex-1">
                <Checkout
                  productId="credit-topup-custom"
                  customTopupUsdAmount={customTopupUsd}
                  disabled={!customTopupValid}
                  buttonText={
                    customTopupValid ? (
                      <>
                        <span className="block font-medium leading-tight">Purchase credits</span>
                        <span className="mt-1 block text-xs font-normal leading-snug opacity-90">
                          ${customTopupUsd} · {(customTopupUsd * 100).toLocaleString()} credits
                        </span>
                      </>
                    ) : (
                      'Enter at least $20'
                    )
                  }
                  buttonClassName={cn(BILLING_TOPUP_BTN, 'disabled:opacity-50')}
                  onComplete={handleCheckoutComplete}
                />
              </div>
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

      <Card id="revenue-pricing" className={BILLING_GLASS}>
        <CardHeader className={BILLING_CARD_HEADER}>
          <CardTitle className="font-semibold">Plans &amp; pricing</CardTitle>
          <CardDescription>
            Same estimate as <Link href="/pricing" className="text-primary underline-offset-4 hover:underline">public pricing</Link>
            . Tiers match Stripe; new subscriptions complete checkout there with the same formula.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 px-4 sm:px-6">
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
            <p className="text-[11px] leading-snug text-muted-foreground sm:ml-auto sm:max-w-[16rem]">
              Main plan: <span className="text-foreground/90">OnlyFans + Fansly</span> (ManyVids optional). Clips / DMCA / other
              sites:{' '}
              <Link href="#protection-plan" className="font-medium text-primary underline-offset-4 hover:underline">
                Protection
              </Link>
              .
            </p>
          </div>

          <Collapsible defaultOpen={false} className="space-y-2">
            <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 rounded-xl border border-border/35 bg-background/25 px-4 py-3 text-left text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-background/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span>Full revenue band matrix</span>
              <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                <span className="hidden sm:inline">Show all tiers</span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
                  aria-hidden
                />
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
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
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      <Card className={BILLING_GLASS} id="protection-plan">
        <CardHeader className={BILLING_CARD_HEADER}>
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

      {showTrialStartCard ? (
        <Card className={cn(BILLING_GLASS, 'mx-auto w-full max-w-md')}>
          <CardHeader className="gap-1.5 px-5 pb-3 pt-9 sm:px-6 sm:pt-10">
            <CardTitle className="text-base font-semibold sm:text-lg">Trial</CardTitle>
            <CardDescription className="text-xs leading-relaxed sm:text-sm">
              Card-required trial: add your payment method first, then your trial credits become active.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5 sm:px-6">
            <div className="flex flex-col gap-3 rounded-xl border border-border/35 bg-background/25 p-3 backdrop-blur-sm sm:flex-row sm:items-center sm:gap-4 sm:p-4">
              <Sparkles className="mx-auto h-7 w-7 shrink-0 text-muted-foreground sm:mx-0 sm:h-8 sm:w-8" />
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <h4 className="font-semibold leading-snug">{PRODUCTS[0]?.name}</h4>
                <p className="text-xs text-muted-foreground sm:text-sm">{PRODUCTS[0]?.description}</p>
              </div>
              <Badge variant="outline" className="mx-auto w-fit shrink-0 sm:mx-0">
                $0
              </Badge>
            </div>
            <div>
              <Checkout
                productId={TRIAL_PLAN_ID}
                onComplete={handleCheckoutComplete}
                buttonText="Start free trial (card required)"
                buttonClassName="w-full"
              />
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                Trial starts after card setup in Stripe. By starting, you authorize automatic billing after the trial
                period unless canceled before renewal.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className={cn(BILLING_GLASS, 'mx-auto w-full max-w-md')}>
        <CardHeader className="gap-1.5 px-5 pb-2 pt-9 sm:px-6 sm:pt-10">
          <CardTitle className="text-base font-semibold sm:text-lg">Invoices</CardTitle>
          <CardDescription className="text-xs leading-relaxed sm:text-sm">
            Open invoice history in Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0 sm:px-6">
          {paidActive ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl border-border/40 sm:w-auto"
              onClick={handleManageBilling}
              disabled={loadingPortal}
            >
              {loadingPortal ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
              Open invoices
            </Button>
          ) : (
            <p className="rounded-xl border border-border/25 bg-background/20 px-3 py-3 text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
              No invoices yet — they appear here once you have an active paid subscription.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
