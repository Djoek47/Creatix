import { adminOverviewExtended } from '@/lib/admin/queries'
import { AdminOverviewRangeFilter } from '@/components/admin/admin-overview-range-filter'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Suspense } from 'react'

type Props = { searchParams: Promise<{ range?: string; day?: string }> }

function fmtUsd(n: number): string {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

export default async function AdminAnalyticsPage({ searchParams }: Props) {
  const sp = await searchParams
  const overview = await adminOverviewExtended({ range: sp.range, day: sp.day })

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <AdminOverviewRangeFilter />
      </Suspense>

      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Usage analytics</h1>
        <p className="text-sm text-muted-foreground">
          Modeled credits + cash-equivalent breakdown by service and by creator for {overview.rangeTitle}.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">By service / tool</CardTitle>
            <CardDescription>
              Credits are modeled from provider USD using the hybrid rate card (base + per-feature override).
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[440px] overflow-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="sticky top-0 bg-card px-4 py-2 font-medium">Tool</th>
                  <th className="sticky top-0 bg-card px-4 py-2 text-right font-medium">Provider USD</th>
                  <th className="sticky top-0 bg-card px-4 py-2 text-right font-medium">Credits</th>
                  <th className="sticky top-0 bg-card px-4 py-2 text-right font-medium">Cash equiv.</th>
                </tr>
              </thead>
              <tbody>
                {overview.usageByToolRows.map((row) => (
                  <tr key={row.feature} className="border-b border-border/60">
                    <td className="max-w-[220px] truncate px-4 py-2 font-mono text-xs">{row.feature}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtUsd(row.estimated_usd)}</td>
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
            <CardTitle className="text-lg">By creator</CardTitle>
            <CardDescription>Top creators by modeled cash-equivalent usage in the selected window.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[440px] overflow-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="sticky top-0 bg-card px-4 py-2 font-medium">Creator</th>
                  <th className="sticky top-0 bg-card px-4 py-2 text-right font-medium">Credits</th>
                  <th className="sticky top-0 bg-card px-4 py-2 text-right font-medium">Cash equiv.</th>
                  <th className="sticky top-0 bg-card px-4 py-2 text-right font-medium">Events</th>
                </tr>
              </thead>
              <tbody>
                {overview.usageByUserRows.map((row) => (
                  <tr key={row.user_id} className="border-b border-border/60">
                    <td className="max-w-[220px] truncate px-4 py-2">
                      {row.full_name ?? row.email ?? row.user_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{row.estimated_credits.toLocaleString()}</td>
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
