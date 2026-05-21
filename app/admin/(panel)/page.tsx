import Link from 'next/link'
import { Suspense } from 'react'
import { adminOverviewExtended } from '@/lib/admin/queries'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AdminRecalculateTelemetryButton } from '@/components/admin/recalculate-telemetry-button'
import { AdminOverviewRangeFilter } from '@/components/admin/admin-overview-range-filter'
import { AdminKpiCard } from '@/components/admin/admin-kpi-card'

type Props = { searchParams: Promise<{ range?: string; day?: string }> }

function fmtUsd(n: number): string {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

function fmtMs(ms: number): string {
  if (ms <= 0) return '0s'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

export default async function AdminOverviewPage({ searchParams }: Props) {
  const sp = await searchParams
  const s = await adminOverviewExtended({ range: sp.range, day: sp.day })

  return (
    <div className="space-y-8">
      <Suspense fallback={null}>
        <AdminOverviewRangeFilter />
      </Suspense>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Admin command center</h1>
          <p className="text-sm text-muted-foreground">
            {s.rangeTitle} window. Unified view across usage events, credit economics, moderation queue, and operations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminRecalculateTelemetryButton />
          <Button variant="outline" size="sm" asChild>
            <a href="/api/admin/export/usage?days=30" target="_blank" rel="noreferrer">
              Export usage CSV
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/analytics">Analytics</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/community">Community approvals</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard label={`Provider USD (${s.rangeTitle})`} value={fmtUsd(s.estimatedUsd30d)} />
        <AdminKpiCard
          label="Modeled credits used"
          value={s.creditsModeledInWindow.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          hint={`Base rate: ${fmtUsd(s.hybridCreditModel.baseUsdPerCredit)} / credit`}
        />
        <AdminKpiCard
          label="Modeled cash equivalent"
          value={fmtUsd(s.creditsCashEquivalentInWindow)}
          className="border-primary/35 bg-primary/10"
        />
        <AdminKpiCard
          label="Wallet credits remaining"
          value={s.walletTotalRemainingAllUsers.toLocaleString()}
          hint={`${s.walletIncludedRemainingAllUsers.toLocaleString()} included + ${s.walletPurchasedRemainingAllUsers.toLocaleString()} purchased`}
        />
        <AdminKpiCard label="Profiles" value={s.profiles.toLocaleString()} />
        <AdminKpiCard label="Messages sent" value={s.messageSendsInWindow.toLocaleString()} hint={s.rangeTitle} />
        <AdminKpiCard label="API errors" value={s.errors30d.toLocaleString()} hint={s.rangeTitle} />
        <AdminKpiCard
          label="Community pending"
          value={s.communityTipCounts.pending.toLocaleString()}
          hint={`${s.communityTipCounts.approved.toLocaleString()} approved / ${s.communityTipCounts.rejected.toLocaleString()} rejected`}
          className="border-amber-500/35 bg-amber-500/[0.08]"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Provider spend mix ({s.rangeTitle})</CardTitle>
            <CardDescription>Top model/provider buckets by token-estimated cost.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[320px] overflow-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="sticky top-0 bg-card px-4 py-2 font-medium">Provider</th>
                  <th className="sticky top-0 bg-card px-4 py-2 text-right font-medium">USD</th>
                  <th className="sticky top-0 bg-card px-4 py-2 text-right font-medium">Tokens</th>
                  <th className="sticky top-0 bg-card px-4 py-2 text-right font-medium">Events</th>
                </tr>
              </thead>
              <tbody>
                {s.providerRows.map((row) => (
                  <tr key={row.bucket} className="border-b border-border/60">
                    <td className="px-4 py-2">{row.label}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtUsd(row.estimated_usd)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{row.tokens.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{row.events.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Operations snapshot</CardTitle>
            <CardDescription>Realtime health indicators for admin and support operations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-muted-foreground">Voice state time</p>
              <p className="font-medium text-foreground">
                idle {fmtMs(s.voiceStateMs.idle)} · working {fmtMs(s.voiceStateMs.working)} · speaking{' '}
                {fmtMs(s.voiceStateMs.speaking)}
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-muted-foreground">Auth activity</p>
              <p className="font-medium text-foreground">
                {s.authSignedInLast7d.toLocaleString()} / {s.authSignedInLast30d.toLocaleString()} signed in (7d / 30d)
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-muted-foreground">Subscription credit meter</p>
              <p className="font-medium text-foreground">
                {s.appAiCreditsUsedTotal.toLocaleString()} credits ({fmtUsd(s.appCreditsUsdEquivalent)})
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Top tools by modeled credits</CardTitle>
            <CardDescription>Hybrid credit model: provider USD to credits using feature-level rates.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[340px] overflow-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="sticky top-0 bg-card px-4 py-2 font-medium">Feature</th>
                  <th className="sticky top-0 bg-card px-4 py-2 text-right font-medium">Credits</th>
                  <th className="sticky top-0 bg-card px-4 py-2 text-right font-medium">Cash Eq.</th>
                </tr>
              </thead>
              <tbody>
                {s.usageByToolRows.slice(0, 12).map((row) => (
                  <tr key={row.feature} className="border-b border-border/60">
                    <td className="max-w-[220px] truncate px-4 py-2 font-mono text-xs">{row.feature}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{row.estimated_credits.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtUsd(row.effective_cash_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Top creators by modeled cash</CardTitle>
            <CardDescription>Cross-service usage scored through the hybrid credit rate card.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[340px] overflow-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="sticky top-0 bg-card px-4 py-2 font-medium">Creator</th>
                  <th className="sticky top-0 bg-card px-4 py-2 text-right font-medium">Cash Eq.</th>
                  <th className="sticky top-0 bg-card px-4 py-2 text-right font-medium">Events</th>
                </tr>
              </thead>
              <tbody>
                {s.usageByUserRows.map((row) => (
                  <tr key={row.user_id} className="border-b border-border/60">
                    <td className="max-w-[220px] truncate px-4 py-2">
                      {row.full_name ?? row.email ?? row.user_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtUsd(row.effective_cash_usd)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{row.events.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
