'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CreditCard, ExternalLink, Loader2 } from 'lucide-react'
import { createCustomerPortalSessionForFlow } from '@/app/actions/stripe'
import { getProduct, PRODUCTS } from '@/lib/products'
import { DASHBOARD_CREDIT_SUMMARY_MARK } from '@/lib/dashboard-credit-summary-marker'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { CREDIT_USD_VALUE } from '@/lib/billing/credit-economics'

type CreditTimelineRow = {
  id: string
  kind: 'debit' | 'credit' | 'expire_adjustment'
  amount: number
  reason_code: string
  created_at: string
}

type Wallet = {
  includedRemaining: number
  purchasedRemaining: number
  totalRemaining: number
}

type AutoTopupSettings = {
  enabled: boolean
  threshold_credits: number
  pack_id: string
  monthly_max_usd_cents: number
  cooldown_minutes: number
  monthly_spent_usd_cents: number
  monthly_window_start: string
  last_attempt_at: string | null
  last_success_at: string | null
  last_payment_intent_id: string | null
  last_error: string | null
  status: string
  consecutive_failures: number
}

type UsageDashboard = {
  wallet: Wallet
  aiCreditsUsed: number
  aiCreditsLimitEffective: number
  autoTopupSettings: AutoTopupSettings
  stripe: {
    hasDefaultPaymentMethod: boolean
    stripeCustomerId: string | null
    lastReceiptUrl: string | null
  }
  flags: { creditAutoTopupServerEnabled: boolean }
}

const PACK_OPTIONS = PRODUCTS.filter((p) => p.id.startsWith('credit-topup-'))

const USAGE_GLASS =
  'rounded-2xl border border-white/45 bg-white/55 py-0 shadow-[0_18px_50px_-26px_rgba(15,23,42,0.2)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/[0.10] dark:bg-slate-950/48 dark:shadow-[0_22px_62px_-30px_rgba(0,0,0,0.52)]'

/** Match billing glass cards: `py-0` needs explicit header top inset. */
const USAGE_CARD_HEADER_TOP = 'pt-10 sm:pt-11'

const COOLDOWN_CHOICES: { value: string; label: string }[] = [
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
  { value: '360', label: '6 hours' },
  { value: '720', label: '12 hours' },
  { value: '1440', label: '24 hours' },
]

function nearestCooldownMinutes(minutes: number): string {
  const presets = COOLDOWN_CHOICES.map((c) => Number.parseInt(c.value, 10))
  const hit = presets.find((p) => p === minutes)
  if (hit != null) return String(hit)
  return String(
    presets.reduce((best, p) => (Math.abs(p - minutes) < Math.abs(best - minutes) ? p : best)),
  )
}

function autoTopupStatusCopy(status: string): { title: string; tone?: 'neutral' | 'attention' | 'danger' } {
  switch (status) {
    case 'active':
      return { title: 'Ready' }
    case 'paused':
      return { title: 'Paused' }
    case 'needs_payment_method':
      return { title: 'Needs a card', tone: 'attention' }
    case 'requires_action':
      return { title: 'Action needed', tone: 'attention' }
    case 'disabled_by_user':
      return { title: 'Off' }
    default:
      return { title: status.replace(/_/g, ' ') }
  }
}

export function UsageCreditsPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<UsageDashboard | null>(null)

  const [enabled, setEnabled] = useState(false)
  const [thresholdUsd, setThresholdUsd] = useState('100')
  const [packId, setPackId] = useState('credit-topup-2000')
  const [monthlyMaxUsd, setMonthlyMaxUsd] = useState('500')
  const [cooldownMinutes, setCooldownMinutes] = useState('360')
  const [creditTopCategories, setCreditTopCategories] = useState<Array<{ reason: string; amount: number }>>([])
  const [creditTimeline, setCreditTimeline] = useState<CreditTimelineRow[]>([])
  const [ledgerLoading, setLedgerLoading] = useState(true)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/billing/usage-dashboard', { credentials: 'include' })
      if (!res.ok) {
        throw new Error('Could not load usage')
      }
      const json = (await res.json()) as UsageDashboard
      setData(json)
      const s = json.autoTopupSettings
      setEnabled(s.enabled)
      setThresholdUsd(
        (s.threshold_credits * CREDIT_USD_VALUE).toLocaleString(undefined, {
          maximumFractionDigits: 2,
          minimumFractionDigits: 0,
        }),
      )
      setPackId(s.pack_id)
      setMonthlyMaxUsd(String(s.monthly_max_usd_cents / 100))
      setCooldownMinutes(nearestCooldownMinutes(s.cooldown_minutes))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openPaymentMethodPortal = async () => {
    setPortalLoading(true)
    try {
      const url = await createCustomerPortalSessionForFlow('payment_method_update')
      window.location.href = url
    } catch {
      try {
        const { createCustomerPortalSession } = await import('@/app/actions/stripe')
        const url = await createCustomerPortalSession()
        window.location.href = url
      } catch {
        // ignore
      }
    } finally {
      setPortalLoading(false)
    }
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const usdParsed = Number.parseFloat(thresholdUsd.replace(/,/g, ''))
      if (!Number.isFinite(usdParsed)) {
        throw new Error('Enter a valid dollar amount for the refill point')
      }
      if (usdParsed < 5) {
        throw new Error('Refill point must be at least $5')
      }
      let thresholdNum = Math.round(usdParsed / CREDIT_USD_VALUE)
      thresholdNum = Math.max(500, Math.min(5_000_000, thresholdNum))
      const monthlyCents = Math.round(Number.parseFloat(monthlyMaxUsd) * 100)
      const coolNum = Number.parseInt(cooldownMinutes, 10)
      const res = await fetch('/api/user/credit-auto-topup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          enabled,
          threshold_credits: thresholdNum,
          pack_id: packId,
          monthly_max_usd_cents: monthlyCents,
          cooldown_minutes: coolNum,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((json as { error?: string }).error || 'Save failed')
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const { wallet, aiCreditsUsed, aiCreditsLimitEffective } = data
  const includedPct =
    aiCreditsLimitEffective > 0
      ? Math.min(100, Math.round((aiCreditsUsed / Math.max(1, aiCreditsLimitEffective)) * 100))
      : 0
  const includedBar =
    wallet.totalRemaining > 0
      ? Math.round((wallet.includedRemaining / wallet.totalRemaining) * 1000) / 10
      : 0
  const purchasedBar = Math.max(0, 100 - includedBar)
  const s = data.autoTopupSettings
  const pack = getProduct(packId)
  const serverOff = !data.flags.creditAutoTopupServerEnabled
  const statusMeta = autoTopupStatusCopy(s.status)
  const refillFloorUsd = Number.parseFloat(thresholdUsd.replace(/,/g, ''))
  const refillFloorLabel = Number.isFinite(refillFloorUsd)
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(refillFloorUsd)
    : null

  return (
    <div className="space-y-6">
      <Card className={cn(USAGE_GLASS, 'overflow-hidden shadow-none ring-1 ring-black/5 dark:ring-white/10')}>
        <CardHeader className={cn('space-y-2 px-6 pb-1 sm:px-8', USAGE_CARD_HEADER_TOP)}>
          <CardTitle className="text-[17px] font-semibold leading-tight tracking-tight text-foreground sm:text-lg">
            Usage &amp; credits
          </CardTitle>
          <CardDescription className="max-w-md text-[13px] leading-relaxed text-muted-foreground">
            Included allowance plus top-ups. Top-ups stay available into the next cycle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 px-6 pb-8 pt-5 sm:px-8 sm:pb-9 sm:pt-6">
          <div className="space-y-3" {...DASHBOARD_CREDIT_SUMMARY_MARK}>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Available</p>
            <p className="text-[2.5rem] font-semibold leading-[1.05] tracking-tight tabular-nums text-foreground sm:text-[2.75rem]">
              {wallet.totalRemaining.toLocaleString()}
            </p>
            <p className="text-[13px] font-normal text-muted-foreground">credits</p>
          </div>

          <div className="space-y-4">
            <div
              className="flex h-[3px] w-full overflow-hidden rounded-full bg-foreground/[0.08] dark:bg-white/[0.08]"
              role="img"
              aria-label={`Balance mix: ${Math.round(includedBar)}% included, ${Math.round(purchasedBar)}% purchased`}
            >
              <div
                className="h-full bg-foreground/35 transition-[width] duration-500 ease-out dark:bg-white/35"
                style={{ width: `${includedBar}%` }}
              />
              <div
                className="h-full bg-foreground/18 transition-[width] duration-500 ease-out dark:bg-white/18"
                style={{ width: `${purchasedBar}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-6 border-t border-border/25 pt-5 text-[13px]">
              <div className="min-w-0 space-y-1">
                <p className="text-[12px] text-muted-foreground">Included</p>
                <p className="tabular-nums font-medium leading-none text-foreground">
                  {wallet.includedRemaining.toLocaleString()}
                </p>
              </div>
              <div className="min-w-0 space-y-1 text-right">
                <p className="text-[12px] text-muted-foreground">Purchased</p>
                <p className="tabular-nums font-medium leading-none text-foreground">
                  {wallet.purchasedRemaining.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {aiCreditsLimitEffective > 0 ? (
            <p className="border-t border-border/25 pt-5 text-[12px] leading-relaxed text-muted-foreground">
              This billing cycle:{' '}
              <span className="tabular-nums text-foreground/90">{aiCreditsUsed.toLocaleString()}</span>
              <span className="text-muted-foreground"> / </span>
              <span className="tabular-nums text-foreground/90">{aiCreditsLimitEffective.toLocaleString()}</span>
              <span className="text-muted-foreground"> included used</span>
              {includedPct > 0 ? <span className="tabular-nums text-muted-foreground"> · {includedPct}%</span> : null}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className={cn(USAGE_GLASS, 'overflow-hidden shadow-none ring-1 ring-black/5 dark:ring-white/10')}>
        <CardHeader className={cn('px-6 pb-2 sm:px-8', USAGE_CARD_HEADER_TOP)}>
          <CardTitle className="text-[17px] font-semibold tracking-tight sm:text-lg">Credit usage</CardTitle>
          <CardDescription className="text-[13px] leading-relaxed">
            Where credits are going right now.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-6 pb-8 sm:px-8">
          {ledgerLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" aria-label="Loading credit activity" />
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-border/35 bg-background/25 p-3 text-sm backdrop-blur-sm">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Top debit reasons
                </p>
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
                      {new Date(row.created_at).toLocaleDateString()} · {row.kind} · {row.reason_code} · {row.amount}{' '}
                      credits
                    </p>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className={cn(USAGE_GLASS, 'overflow-hidden shadow-none ring-1 ring-black/5 dark:ring-white/10')}>
        <CardHeader
          className={cn('space-y-2 border-b border-border/15 px-6 pb-5 sm:px-8 sm:pb-6', USAGE_CARD_HEADER_TOP)}
        >
          <CardTitle className="text-[17px] font-semibold tracking-tight sm:text-lg">Automatic top-up</CardTitle>
          <CardDescription className="max-w-lg text-[13px] leading-[1.5] text-muted-foreground">
            When your balance runs low, we bill a fixed amount to the card on file. You choose that amount and how low
            is “low.” Tax is handled at checkout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-0 px-6 pb-8 pt-6 sm:px-8 sm:pb-9 sm:pt-8">
          {serverOff ? (
            <div className="mb-8 flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3.5 text-[13px] leading-relaxed text-amber-950/95 dark:text-amber-100/95">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
              <p>
                Automatic top-up isn&apos;t charging accounts here yet. You can still set preferences—they&apos;ll apply when
                billing enables this for your workspace.
              </p>
            </div>
          ) : null}

          {error ? (
            <p className="mb-6 text-[13px] text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-4 border-b border-border/15 py-5 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div className="min-w-0 space-y-1">
              <Label htmlFor="auto-topup-enabled" className="text-[13px] font-medium text-foreground">
                Auto-refill
              </Label>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                We check periodically and charge only when you&apos;re below your refill point.
              </p>
            </div>
            <Switch id="auto-topup-enabled" checked={enabled} onCheckedChange={setEnabled} className="shrink-0" />
          </div>

          <div className="space-y-8 border-b border-border/15 py-8">
            <div className="grid gap-8 sm:grid-cols-2 sm:gap-12">
              <div className="space-y-2">
                <Label htmlFor="threshold-usd" className="text-[13px] font-medium text-foreground">
                  Refill when balance drops below
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="threshold-usd"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    className="h-11 rounded-lg border-border/40 bg-background/40 pl-7 text-[15px] tabular-nums"
                    value={thresholdUsd}
                    onChange={(e) => setThresholdUsd(e.target.value.replace(/[^0-9.,]/g, ''))}
                  />
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">Minimum $5.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="refill-amount" className="text-[13px] font-medium text-foreground">
                  Each refill charges
                </Label>
                <Select value={packId} onValueChange={setPackId}>
                  <SelectTrigger
                    id="refill-amount"
                    className="h-11 rounded-lg border-border/40 bg-background/40 text-[15px]"
                  >
                    <SelectValue placeholder="Choose amount" />
                  </SelectTrigger>
                  <SelectContent>
                    {PACK_OPTIONS.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-[15px]">
                        {formatUsdFromCents(p.priceInCents)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {pack ? (
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                When you&apos;re under{' '}
                <span className="tabular-nums text-foreground/90">{refillFloorLabel ?? '—'}</span>, we charge{' '}
                <span className="tabular-nums text-foreground/90">{formatUsdFromCents(pack.priceInCents)}</span> once.
                Tax is finalized in checkout.
              </p>
            ) : null}
          </div>

          <div className="grid gap-8 border-b border-border/15 py-8 sm:grid-cols-2 sm:gap-12">
            <div className="space-y-2">
              <Label htmlFor="monthly-max" className="text-[13px] font-medium text-foreground">
                Monthly spending cap
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
                  $
                </span>
                <Input
                  id="monthly-max"
                  type="number"
                  min={5}
                  step={1}
                  className="h-11 rounded-lg border-border/40 bg-background/40 pl-7 text-[15px] tabular-nums"
                  value={monthlyMaxUsd}
                  onChange={(e) => setMonthlyMaxUsd(e.target.value)}
                />
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                This month:{' '}
                <span className="tabular-nums text-foreground/85">{formatUsdFromCents(s.monthly_spent_usd_cents)}</span>
                <span className="text-muted-foreground"> · resets start of each month (UTC)</span>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cooldown-select" className="text-[13px] font-medium text-foreground">
                Wait between refills
              </Label>
              <Select value={cooldownMinutes} onValueChange={setCooldownMinutes}>
                <SelectTrigger
                  id="cooldown-select"
                  className="h-11 rounded-lg border-border/40 bg-background/40 text-[15px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COOLDOWN_CHOICES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 py-6">
            <span className="text-[12px] text-muted-foreground">Status</span>
            <Badge
              variant="secondary"
              className={cn(
                'rounded-md font-normal',
                statusMeta.tone === 'attention' && 'border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100',
                statusMeta.tone === 'danger' && 'border-destructive/40 bg-destructive/10',
              )}
            >
              {statusMeta.title}
            </Badge>
            {s.consecutive_failures > 0 ? (
              <Badge variant="destructive" className="rounded-md font-normal">
                Failed {s.consecutive_failures}x
              </Badge>
            ) : null}
            {!data.stripe.hasDefaultPaymentMethod ? (
              <Badge variant="outline" className="rounded-md border-amber-500/40 font-normal text-amber-800 dark:text-amber-200">
                No card on file
              </Badge>
            ) : null}
          </div>

          {s.last_error ? (
            <p className="pb-6 text-[12px] leading-relaxed text-destructive">{s.last_error}</p>
          ) : null}

          {(s.last_attempt_at || s.last_success_at) && (
            <div className="space-y-1.5 border-t border-border/15 py-5 text-[11px] leading-relaxed text-muted-foreground">
              {s.last_success_at ? (
                <p>
                  Last successful refill: {new Date(s.last_success_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              ) : null}
              {s.last_attempt_at ? (
                <p>
                  Last attempt: {new Date(s.last_attempt_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              ) : null}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-border/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-3">
              <Button
                className="h-10 rounded-lg px-5 text-[14px] font-medium"
                onClick={() => void save()}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-lg border-border/45 bg-transparent px-5 text-[14px] font-medium"
                onClick={() => void openPaymentMethodPortal()}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Card on file
                  </>
                )}
              </Button>
            </div>
            {data.stripe.lastReceiptUrl ? (
              <a
                href={data.stripe.lastReceiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground"
              >
                Last receipt <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
