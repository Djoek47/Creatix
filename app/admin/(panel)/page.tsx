import Link from 'next/link'
import { adminOverviewStats } from '@/lib/admin/queries'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function AdminOverviewPage() {
  const s = await adminOverviewStats()

  const fmtUsd = (n: number) =>
    n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground">Estimated AI spend and error volume (telemetry tables).</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/api/admin/export/usage?days=30" target="_blank" rel="noreferrer">
              Export usage CSV
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/settings">Settings</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription>Est. AI cost (30d)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{fmtUsd(s.estimatedUsd30d)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Sum of estimated_usd on ai_usage_events (from ai_unit_costs).
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription>Est. AI cost (7d)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{fmtUsd(s.estimatedUsd7d)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Recent week rollup.</CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription>Tokens (30d)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{s.tokens30d.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Input + output tokens logged.</CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription>API errors (30d)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{s.errors30d}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Rows in api_error_logs.</CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription>Profiles</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{s.profiles}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Total profiles rows.</CardContent>
        </Card>
      </div>
    </div>
  )
}
