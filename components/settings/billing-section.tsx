'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkout } from '@/components/stripe/checkout'
import { PRODUCTS, PAID_TIER_FEATURES } from '@/lib/products'
import {
  getSubscriptionStatus,
  createCustomerPortalSession,
  createCustomerPortalSessionForFlow,
} from '@/app/actions/stripe'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  type BillingVariant,
} from '@/lib/pricing-matrix'
import { PAID_PLAN_ID, isPaidPlanId } from '@/lib/billing/access'

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
  revenue_tier?: number | null
  revenue_band_label?: string | null
  stripe_customer_id?: string | null
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
  const [checkoutVariant, setCheckoutVariant] = useState<BillingVariant>('single')
  const [checkoutTierIndex, setCheckoutTierIndex] = useState(4)
  const supabase = createClient()

  const loadSubscriptionData = useCallback(async () => {
    if (!userId) return

    const { data } = await supabase.from('subscriptions').select('*').eq('user_id', userId).single()

    if (data) {
      setSubData(data as SubscriptionData)
      const row = data as SubscriptionData
      if (typeof row.revenue_tier === 'number' && row.revenue_tier >= 0 && row.revenue_tier <= 10) {
        setCheckoutTierIndex(row.revenue_tier)
      }
      if (row.billing_variant === 'single' || row.billing_variant === 'multi') {
        setCheckoutVariant(row.billing_variant)
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

  const planId = subscription?.planId || subData?.plan_id
  const paidActive =
    isPaidPlanId(planId) &&
    (subscription?.status === 'active' ||
      subscription?.status === 'trialing' ||
      subData?.status === 'active' ||
      subData?.status === 'trialing')

  const checkoutPrice = getMonthlyPriceUsd(checkoutVariant, checkoutTierIndex)

  const currentPlan = subscription?.plan
    ? { name: subscription.plan, priceMonthly: paidActive ? checkoutPrice : 0 }
    : { name: PRODUCTS.find((p) => p.id === 'divine-trial')?.name || 'Divine Trial', priceMonthly: 0 }

  const aiCreditsUsed = subData?.ai_credits_used || 0
  const aiCreditsLimit = subData?.ai_credits_limit || 100
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
                  {paidActive ? `$${getMonthlyPriceUsd((subData?.billing_variant as BillingVariant) || 'single', subData?.revenue_tier ?? 4)}` : `$${currentPlan?.priceMonthly ?? 0}`}
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
                    Choose revenue band & subscribe
                  </Button>
                </>
              )}
            </div>
            {paidActive && (
              <p className="mt-3 text-xs text-muted-foreground">
                To change revenue band or Single/Multi, use the selector below (new checkout) or cancel and
                resubscribe. The Stripe portal may not list every price when using dynamic checkout.
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
            <div className="rounded-lg border border-border p-4 text-center">
              <Zap className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-2 font-medium">AI Credits</p>
              <p className="text-2xl font-bold">
                {aiCreditsUsed}/{aiCreditsLimit === 999999 ? '∞' : aiCreditsLimit}
              </p>
              <Progress
                value={(aiCreditsUsed / Math.min(aiCreditsLimit, 1000)) * 100}
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

      <Card id="revenue-pricing" className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-semibold">Revenue-based pricing</CardTitle>
          <CardDescription>
            <strong>Single</strong> covers OnlyFans only. <strong>Multi</strong> is for OnlyFans plus other
            adult platforms (e.g. Fansly, ManyVids). Pick the band that matches your monthly creator revenue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-2 flex-1">
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
            <div className="space-y-2">
              <Label>Plan type</Label>
              <Tabs
                value={checkoutVariant}
                onValueChange={(v) => setCheckoutVariant(v as BillingVariant)}
                className="w-full sm:w-[280px]"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="single">Single (OnlyFans)</TabsTrigger>
                  <TabsTrigger value="multi">Multi (OF + more)</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Your selection</p>
                <p className="text-lg font-semibold">
                  {checkoutVariant === 'single' ? 'Single' : 'Multi'} ·{' '}
                  {REVENUE_TIERS.find((t) => t.tierIndex === checkoutTierIndex)?.label}
                </p>
              </div>
              <p className="text-3xl font-bold">${checkoutPrice}/mo</p>
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {PAID_TIER_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Checkout
                productId={PAID_PLAN_ID}
                billingVariant={checkoutVariant}
                tierIndex={checkoutTierIndex}
                buttonText={
                  paidActive ? `Checkout new price — $${checkoutPrice}/mo` : `Subscribe — $${checkoutPrice}/mo`
                }
                buttonVariant="default"
                buttonClassName="w-full sm:w-auto"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="p-3 text-left font-medium">Monthly revenue</th>
                  <th className="p-3 text-right font-medium">Single</th>
                  <th className="p-3 text-right font-medium">Multi</th>
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
                    <td className="p-3 text-right">${row.singlePriceUsd}</td>
                    <td className="p-3 text-right">${row.multiPriceUsd}</td>
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
