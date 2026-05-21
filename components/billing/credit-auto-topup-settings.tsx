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
import { cn } from '@/lib/utils'
import { CREDIT_USD_VALUE } from '@/lib/billing/credit-economics'
import { formatUsdFromCents } from '@/lib/billing/format-usd'

export type AutoTopupSettingsRow = {
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

export type UsageDashboardSnapshot = {
  autoTopupSettings: AutoTopupSettingsRow
  stripe: {
    hasDefaultPaymentMethod: boolean
    stripeCustomerId: string | null
    lastReceiptUrl: string | null
  }
  flags: { creditAutoTopupServerEnabled: boolean }
}

const PACK_OPTIONS = PRODUCTS.filter((p) => p.id.startsWith('credit-topup-'))

const USAGE_SURFACE = cn(
  'gap-0 rounded-[28px] border py-0 shadow-none backdrop-blur-2xl',
  'border-black/[0.06] bg-background/75',
  'dark:border-white/[0.07] dark:bg-zinc-950/42',
)

const USAGE_HEADER_TOPUP = cn(
  'space-y-2 border-b border-border/30 px-8 pb-7 pt-12 sm:px-10 sm:pb-8 sm:pt-14',
  'dark:border-white/[0.06]',
)

const USAGE_CARD_TITLE = cn(
  'font-sans text-[1.3125rem] font-semibold tracking-[-0.024em] text-foreground',
  'leading-[1.15] sm:text-[1.4375rem]',
)
const USAGE_CARD_DESC = 'max-w-lg font-sans text-[0.9375rem] leading-[1.58] text-muted-foreground'

const USAGE_CONTENT_TOPUP = 'space-y-0 px-8 pb-10 pt-9 sm:px-10 sm:pb-12'

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

export type CreditAutoTopupSettingsProps = {
  /** Tighter spacing for dialogs */
  compact?: boolean
  onSaved?: () => void | Promise<void>
  /** When set (e.g. Settings Usage tab), skip initial fetch */
  initialDashboard?: UsageDashboardSnapshot | null
}

export function CreditAutoTopupSettings({
  compact = false,
  onSaved,
  initialDashboard = null,
}: CreditAutoTopupSettingsProps) {
  const [loading, setLoading] = useState(!initialDashboard)
  const [saving, setSaving] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dash, setDash] = useState<UsageDashboardSnapshot | null>(initialDashboard)

  const [enabled, setEnabled] = useState(false)
  const [thresholdUsd, setThresholdUsd] = useState('100')
  const [packId, setPackId] = useState('credit-topup-2000')
  const [monthlyMaxUsd, setMonthlyMaxUsd] = useState('500')
  const [cooldownMinutes, setCooldownMinutes] = useState('360')

  const hydrateFromSnapshot = useCallback((json: UsageDashboardSnapshot) => {
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
  }, [])

  const loadRemote = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/billing/usage-dashboard', { credentials: 'include' })
      if (!res.ok) throw new Error('Could not load usage')
      const json = (await res.json()) as UsageDashboardSnapshot & { wallet?: unknown }
      const snapshot: UsageDashboardSnapshot = {
        autoTopupSettings: json.autoTopupSettings,
        stripe: json.stripe,
        flags: json.flags,
      }
      setDash(snapshot)
      hydrateFromSnapshot(snapshot)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [hydrateFromSnapshot])

  useEffect(() => {
    if (initialDashboard != null) {
      setDash(initialDashboard)
      hydrateFromSnapshot(initialDashboard)
      setLoading(false)
      return
    }
    void loadRemote()
  }, [initialDashboard, hydrateFromSnapshot, loadRemote])

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
        //
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
      if (initialDashboard != null) {
        await Promise.resolve(onSaved?.())
      } else {
        await loadRemote()
        onSaved?.()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !dash) {
    return (
      <div className={cn('flex items-center gap-2 py-8 text-sm text-muted-foreground', compact && 'py-4')}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading auto top-up…
      </div>
    )
  }

  const s = dash.autoTopupSettings
  const serverOff = !dash.flags.creditAutoTopupServerEnabled
  const statusMeta = autoTopupStatusCopy(s.status)
  const refillFloorUsd = Number.parseFloat(thresholdUsd.replace(/,/g, ''))
  const refillFloorLabel = Number.isFinite(refillFloorUsd)
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(refillFloorUsd)
    : null
  const pack = getProduct(packId)

  const headerPad = compact ? 'px-5 pb-5 pt-6 sm:px-6 sm:pt-8' : undefined
  const contentPad = compact ? 'px-5 pb-6 pt-4 sm:px-6 sm:pb-8' : undefined

  return (
    <Card id="credit-auto-topup" className={cn(USAGE_SURFACE, 'overflow-hidden')}>
      <CardHeader className={cn(USAGE_HEADER_TOPUP, headerPad)}>
        <CardTitle className={USAGE_CARD_TITLE}>Automatic top-up</CardTitle>
        <CardDescription className={USAGE_CARD_DESC}>
          When your balance runs low, we bill a fixed amount to the card on file. You choose that amount and how low is
          “low.” Tax is handled at checkout.
        </CardDescription>
      </CardHeader>
      <CardContent className={cn(USAGE_CONTENT_TOPUP, contentPad)}>
        {serverOff ? (
          <div className="mb-9 flex gap-4 rounded-[20px] border border-amber-500/22 bg-amber-500/[0.06] px-5 py-4 text-[13px] leading-relaxed text-amber-950/95 backdrop-blur-sm dark:border-amber-400/15 dark:bg-amber-500/[0.05] dark:text-amber-100/95">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 opacity-75" aria-hidden />
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

        <div className="flex flex-col gap-5 border-b border-border/25 py-8 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="auto-topup-enabled" className="text-[13px] font-medium text-foreground">
              Auto-refill
            </Label>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              We check periodically and charge only when you&apos;re below your refill point.
            </p>
          </div>
          <Switch id="auto-topup-enabled" checked={enabled} onCheckedChange={setEnabled} className="shrink-0" />
        </div>

        <div className="space-y-8 border-b border-border/25 py-10">
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
                  className="h-11 rounded-xl border-border/35 bg-background/45 pl-7 text-[15px] shadow-sm ring-1 ring-transparent transition-[box-shadow,border-color] duration-200 focus-visible:ring-foreground/15 tabular-nums"
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
                  className="h-11 rounded-xl border-border/35 bg-background/45 text-[15px] shadow-sm transition-[border-color] duration-200"
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
              <span className="tabular-nums text-foreground/90">{formatUsdFromCents(pack.priceInCents)}</span> once. Tax is
              finalized in checkout.
            </p>
          ) : null}
        </div>

        <div className="grid gap-8 border-b border-border/25 py-10 sm:grid-cols-2 sm:gap-12">
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
                className="h-11 rounded-xl border-border/35 bg-background/45 pl-7 text-[15px] shadow-sm ring-1 ring-transparent transition-[box-shadow,border-color] duration-200 focus-visible:ring-foreground/15 tabular-nums"
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
                className="h-11 rounded-xl border-border/35 bg-background/45 text-[15px] shadow-sm transition-[border-color] duration-200"
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
          {!dash.stripe.hasDefaultPaymentMethod ? (
            <Badge variant="outline" className="rounded-md border-amber-500/40 font-normal text-amber-800 dark:text-amber-200">
              No card on file
            </Badge>
          ) : null}
        </div>

        {s.last_error ? (
          <p className="pb-6 text-[12px] leading-relaxed text-destructive">{s.last_error}</p>
        ) : null}

        {(s.last_attempt_at || s.last_success_at) && (
          <div className="space-y-1.5 border-t border-border/25 py-8 text-[12px] leading-relaxed text-muted-foreground">
            {s.last_success_at ? (
              <p>
                Last successful refill:{' '}
                {new Date(s.last_success_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            ) : null}
            {s.last_attempt_at ? (
              <p>
                Last attempt:{' '}
                {new Date(s.last_attempt_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            ) : null}
          </div>
        )}

        <div className="flex flex-col gap-4 border-t border-border/25 pt-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3">
            <Button
              className="h-11 rounded-xl px-7 text-[15px] font-medium transition-colors duration-200"
              onClick={() => void save()}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl border-border/35 bg-transparent px-7 text-[15px] font-medium transition-colors duration-200"
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
          {dash.stripe.lastReceiptUrl ? (
            <a
              href={dash.stripe.lastReceiptUrl}
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
  )
}
