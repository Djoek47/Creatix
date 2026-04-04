import Link from 'next/link'
import { Suspense } from 'react'
import { adminOverviewExtended } from '@/lib/admin/queries'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AdminRecalculateTelemetryButton } from '@/components/admin/recalculate-telemetry-button'
import { AdminOverviewRangeFilter } from '@/components/admin/admin-overview-range-filter'
import { cn } from '@/lib/utils'

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

type Props = { searchParams: Promise<{ range?: string; day?: string }> }

export default async function AdminOverviewPage({ searchParams }: Props) {
  const sp = await searchParams
  const s = await adminOverviewExtended({ range: sp.range, day: sp.day })

  const fmtUsd = (n: number) =>
    n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

  const top = s.topUsers[0]
  const fmtHours = (h: number) =>
    h >= 1000 ? `${(h / 1000).toFixed(1)}k h` : `${Math.round(h)} h`

  return (
    <div className="space-y-8">
      <Suspense fallback={null}>
        <AdminOverviewRangeFilter />
      </Suspense>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{s.rangeTitle}</span> — AI usage rows, messages sent, Divine
            voice time, provider spend, and credits. Use Live or Today to debug “nothing logged” gaps.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <AdminRecalculateTelemetryButton />
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

      {s.usageEventsTruncated && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Usage rollup capped at 40k events for this window — provider totals may be incomplete. Use CSV export or DB
          views for full reconciliation.
        </p>
      )}

      {s.rangeMode === 'live' && (
        <p className="rounded-lg border border-sky-500/35 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
          Live: last 60 minutes of <code className="text-[10px]">ai_usage_events</code> and{' '}
          <code className="text-[10px]">message_send_events</code>. Divine voice time below is still summed by UTC day
          (today’s row updates in real time).
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription>Est. AI cost ({s.rangeTitle})</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{fmtUsd(s.estimatedUsd30d)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Sum of estimated_usd on ai_usage_events (from ai_unit_costs).
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription>Est. AI cost (rolling 7d)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{fmtUsd(s.estimatedUsd7d)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Always last 7 days from now (comparison).</CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription>Model tokens ({s.rangeTitle})</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{s.totalTokens30d.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            From logged AI calls (input + output / total_tokens). Separate from in-app credit counter below.
          </CardContent>
        </Card>

        <Card className="border-border border-emerald-500/25 bg-emerald-500/[0.04]">
          <CardHeader className="pb-2">
            <CardDescription>Messages sent ({s.rangeTitle})</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{s.messageSendsInWindow.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Rows in <code className="text-[10px]">message_send_events</code> (1:1 DMs + one aggregate per mass send).
          </CardContent>
        </Card>

        <Card className="border-border border-violet-500/25 bg-violet-500/[0.04]">
          <CardHeader className="pb-2">
            <CardDescription>Divine voice time ({s.rangeTitle})</CardDescription>
            <CardTitle className="text-lg tabular-nums leading-snug">
              idle {fmtMs(s.voiceStateMs.idle)} · work {fmtMs(s.voiceStateMs.working)} · speak{' '}
              {fmtMs(s.voiceStateMs.speaking)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            WebRTC connected time by UI state (idle / working / speaking). Summed from{' '}
            <code className="text-[10px]">divine_voice_state_daily</code> for UTC days overlapping the filter.
          </CardContent>
        </Card>

        <Card className="border-border border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardDescription>App AI credits used (all plans)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{s.appAiCreditsUsedTotal.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Sum of <code className="text-[10px]">subscriptions.ai_credits_used</code> — website meter incremented by
            tools (not token-for-token with providers). Across {s.subscriptionsRowCount} subscription rows.
            <div className="mt-2 text-foreground">
              Display USD @ {fmtUsd(s.appCreditUsdRate)} / credit →{' '}
              <span className="font-medium tabular-nums">{fmtUsd(s.appCreditsUsdEquivalent)}</span> total (set{' '}
              <code className="text-[10px]">ADMIN_APP_CREDIT_USD_ESTIMATE</code>).
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription>API errors ({s.rangeTitle})</CardDescription>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Auth activity (Supabase)</CardTitle>
            <CardDescription>
              From Auth Admin API — not in-app session timers. “Span hours” sums (last_sign_in_at − created_at) per
              user as a coarse signal, not wall-clock time in the app.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Auth users listed</p>
              <p className="text-xl font-semibold tabular-nums">{s.authUsersTotal.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Signed in (7d / 30d)</p>
              <p className="text-xl font-semibold tabular-nums">
                {s.authSignedInLast7d} / {s.authSignedInLast30d}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Aggregate sign-in span (sum of hours)</p>
              <p className="text-xl font-semibold tabular-nums">{fmtHours(s.aggregateSignInSpanHours)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Est. spend by provider ({s.rangeTitle})</CardTitle>
            <CardDescription>Grouped from <code className="text-xs">ai_usage_events.provider</code>.</CardDescription>
          </CardHeader>
          <CardContent>
            {s.providerRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No usage events in this window.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">Provider</th>
                      <th className="pb-2 pr-3 text-right font-medium">Est. USD</th>
                      <th className="pb-2 pr-3 text-right font-medium">Tokens</th>
                      <th className="pb-2 text-right font-medium">Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.providerRows.map((r) => (
                      <tr key={r.bucket} className="border-b border-border/50">
                        <td className="py-2 pr-3">{r.label}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{fmtUsd(r.estimated_usd)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{r.tokens.toLocaleString()}</td>
                        <td className="py-2 text-right tabular-nums">{r.events.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-serif text-lg">By service / feature ({s.rangeTitle})</CardTitle>
            <CardDescription>
              <code className="text-xs">ai_usage_events.feature</code> — token-based USD (not the in-app credit counter).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {s.featureRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attributed usage in this window.</p>
            ) : (
              <div className="max-h-[320px] overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="sticky top-0 bg-card pb-2 pr-3 font-medium">Feature</th>
                      <th className="sticky top-0 bg-card pb-2 pr-3 text-right font-medium">Est. USD</th>
                      <th className="sticky top-0 bg-card pb-2 pr-3 text-right font-medium">Tokens</th>
                      <th className="sticky top-0 bg-card pb-2 text-right font-medium">Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.featureRows.map((r) => (
                      <tr key={r.feature} className="border-b border-border/50">
                        <td className="max-w-[220px] truncate py-2 pr-3 font-mono text-xs">{r.feature}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{fmtUsd(r.estimated_usd)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{r.tokens.toLocaleString()}</td>
                        <td className="py-2 text-right tabular-nums">{r.events.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Feature × provider (top 40, {s.rangeTitle})</CardTitle>
            <CardDescription>Which models/routes drove spend under each feature label.</CardDescription>
          </CardHeader>
          <CardContent>
            {s.featureProviderRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rows.</p>
            ) : (
              <div className="max-h-[320px] overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="sticky top-0 bg-card pb-2 pr-2 font-medium">Feature</th>
                      <th className="sticky top-0 bg-card pb-2 pr-3 font-medium">Provider</th>
                      <th className="sticky top-0 bg-card pb-2 pr-3 text-right font-medium">Est. USD</th>
                      <th className="sticky top-0 bg-card pb-2 text-right font-medium">Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.featureProviderRows.map((r) => (
                      <tr
                        key={`${r.feature}:${r.bucket}`}
                        className="border-b border-border/50"
                      >
                        <td className="max-w-[140px] truncate py-2 pr-2 font-mono text-xs">{r.feature}</td>
                        <td className="py-2 pr-3">{r.label}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{fmtUsd(r.estimated_usd)}</td>
                        <td className="py-2 text-right tabular-nums">{r.events.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card
        className={cn(
          'border-border',
          top && 'border-amber-500/35 bg-gradient-to-br from-amber-500/[0.07] to-transparent',
        )}
      >
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="font-serif text-lg">Top users by est. AI spend ({s.rangeTitle})</CardTitle>
            <CardDescription>Highest <code className="text-xs">estimated_usd</code> in the selected window.</CardDescription>
          </div>
          {top && (
            <Badge className="border-amber-500/50 bg-amber-500/15 text-amber-100">Top: {top.email ?? top.user_id.slice(0, 8)}</Badge>
          )}
        </CardHeader>
        <CardContent>
          {s.topUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attributed usage in this window.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">#</th>
                    <th className="pb-2 pr-3 font-medium">User</th>
                    <th className="pb-2 pr-3 text-right font-medium">Est. USD</th>
                    <th className="pb-2 pr-3 text-right font-medium">Tokens</th>
                    <th className="pb-2 text-right font-medium">Events</th>
                    <th className="pb-2 pl-3" />
                  </tr>
                </thead>
                <tbody>
                  {s.topUsers.map((u, i) => (
                    <tr
                      key={u.user_id}
                      className={cn(
                        'border-b border-border/50',
                        i === 0 && 'bg-amber-500/10 font-medium',
                      )}
                    >
                      <td className="py-2 pr-3 tabular-nums text-muted-foreground">{i + 1}</td>
                      <td className="py-2 pr-3">
                        <div className="max-w-[200px] truncate">{u.email ?? u.user_id}</div>
                        {u.full_name && (
                          <div className="max-w-[200px] truncate text-xs text-muted-foreground">{u.full_name}</div>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmtUsd(u.estimated_usd)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{u.tokens.toLocaleString()}</td>
                      <td className="py-2 text-right tabular-nums">{u.events.toLocaleString()}</td>
                      <td className="py-2 pl-3">
                        <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                          <Link href={`/admin/users/${u.user_id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
