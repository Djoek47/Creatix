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

function formatUsdFromCents(cents: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function UsageCreditsPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<UsageDashboard | null>(null)

  const [enabled, setEnabled] = useState(false)
  const [threshold, setThreshold] = useState('10000')
  const [packId, setPackId] = useState('credit-topup-2000')
  const [monthlyMaxUsd, setMonthlyMaxUsd] = useState('500')
  const [cooldownMinutes, setCooldownMinutes] = useState('360')

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
      setThreshold(String(s.threshold_credits))
      setPackId(s.pack_id)
      setMonthlyMaxUsd(String(s.monthly_max_usd_cents / 100))
      setCooldownMinutes(String(s.cooldown_minutes))
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
      const thresholdNum = Number.parseInt(threshold, 10)
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

  return (
    <div className="space-y-6">
      <Card className={USAGE_GLASS}>
        <CardHeader>
          <CardTitle className="text-[1.0625rem] font-semibold tracking-tight">Usage & credits</CardTitle>
          <CardDescription>
            Total balance combines your monthly included allowance and purchased top-ups. Purchased credits roll for an
            extra month after your current cycle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div {...DASHBOARD_CREDIT_SUMMARY_MARK}>
            <p className="text-sm text-muted-foreground">Total available</p>
            <p className="text-4xl font-semibold tabular-nums">{wallet.totalRemaining.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">credits</p>
          </div>

          <div className="space-y-2">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary/90 transition-all"
                style={{ width: `${includedBar}%` }}
                title="Included remaining"
              />
              <div
                className="h-full bg-amber-500/80 transition-all"
                style={{ width: `${purchasedBar}%` }}
                title="Purchased remaining"
              />
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>
                Included: <span className="text-foreground font-medium">{wallet.includedRemaining.toLocaleString()}</span>
              </span>
              <span>
                Purchased:{' '}
                <span className="text-foreground font-medium">{wallet.purchasedRemaining.toLocaleString()}</span>
              </span>
            </div>
          </div>

          <div className="space-y-1 rounded-xl border border-border/35 bg-background/30 p-4 backdrop-blur-sm">
            <p className="text-sm font-medium">Monthly included allowance</p>
            <p className="text-sm text-muted-foreground">
              Used {aiCreditsUsed.toLocaleString()} of {aiCreditsLimitEffective.toLocaleString()} this cycle (
              {includedPct}%).
            </p>
            <p className="text-xs text-muted-foreground">
              This percentage only reflects included credits, not your purchased balance.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className={USAGE_GLASS}>
        <CardHeader>
          <CardTitle className="text-[1.0625rem] font-semibold tracking-tight">Automatic top-up</CardTitle>
          <CardDescription>
            When your total balance is at or below the threshold, we charge your saved card for the pack you choose.
            Credits are added after Stripe confirms payment (usually within a minute).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {serverOff && (
            <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Automatic charging is off on the server until your operator enables{' '}
                <code className="text-xs">CREDIT_AUTO_TOPUP_ENABLED</code>. You can still save preferences here.
              </span>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="auto-topup-enabled">Enable auto top-up</Label>
              <p className="text-xs text-muted-foreground">Runs on a short schedule when you are below the threshold.</p>
            </div>
            <Switch id="auto-topup-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="threshold">Threshold (credits)</Label>
              <Input
                id="threshold"
                type="number"
                min={500}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Charge when total balance ≤ this value.</p>
            </div>
            <div className="space-y-2">
              <Label>Pack</Label>
              <Select value={packId} onValueChange={setPackId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PACK_OPTIONS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {formatUsdFromCents(p.priceInCents)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly-max">Max auto top-up / month (USD)</Label>
              <Input
                id="monthly-max"
                type="number"
                min={5}
                step={1}
                value={monthlyMaxUsd}
                onChange={(e) => setMonthlyMaxUsd(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Spent this window: {formatUsdFromCents(s.monthly_spent_usd_cents)} (resets UTC month).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cooldown">Cooldown (minutes)</Label>
              <Input
                id="cooldown"
                type="number"
                min={30}
                value={cooldownMinutes}
                onChange={(e) => setCooldownMinutes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge variant="secondary">{s.status.replace(/_/g, ' ')}</Badge>
            {s.consecutive_failures > 0 && (
              <Badge variant="destructive">Failures: {s.consecutive_failures}</Badge>
            )}
            {!data.stripe.hasDefaultPaymentMethod && (
              <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                No card on file
              </Badge>
            )}
          </div>

          {s.last_error && (
            <p className="text-sm text-destructive">
              Last error: {s.last_error}
            </p>
          )}

          {(s.last_attempt_at || s.last_success_at) && (
            <div className="text-xs text-muted-foreground space-y-1">
              {s.last_attempt_at && <p>Last attempt: {new Date(s.last_attempt_at).toLocaleString()}</p>}
              {s.last_success_at && <p>Last success: {new Date(s.last_success_at).toLocaleString()}</p>}
            </div>
          )}

          {data.stripe.lastReceiptUrl && (
            <a
              href={data.stripe.lastReceiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View last Stripe receipt <ExternalLink className="h-3 w-3" />
            </a>
          )}

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save usage settings'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="inline-flex items-center gap-2"
              onClick={() => void openPaymentMethodPortal()}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  <span>Manage card on file</span>
                </>
              )}
            </Button>
          </div>

          {pack && (
            <p className="text-xs text-muted-foreground">
              Next charge would be {formatUsdFromCents(pack.priceInCents)} for {pack.credits?.toLocaleString()} credits
              (plus any taxes Stripe applies).
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
