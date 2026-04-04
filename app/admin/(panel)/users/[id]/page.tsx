import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  adminUserDetail,
  adminUserPlatformConnections,
  adminUserUsageDailySeries,
} from '@/lib/admin/queries'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserUsageChart } from '@/components/admin/user-usage-chart'
import { AdminUserUsageWebhookForm } from '@/components/admin/user-usage-webhook-form'
import { Badge } from '@/components/ui/badge'

type Props = { params: Promise<{ id: string }> }

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params
  const [
    {
      profile,
      usage,
      errors,
      usageSumUsd90d,
      subscription,
      usageWebhook,
      usageByFeature90d,
      usageByProvider90d,
      appCreditUsdRate,
      appCreditsUsdEquivalent,
      messageSendEvents90d,
      voiceState90d,
    },
    connections,
    daily,
  ] = await Promise.all([
    adminUserDetail(id),
    adminUserPlatformConnections(id),
    adminUserUsageDailySeries(id, 30),
  ])

  if (!profile) notFound()

  const fmtUsd = (n: number) =>
    n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 4 })

  const fmtMs = (ms: number) => {
    if (ms <= 0) return '0s'
    const s = Math.floor(ms / 1000)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${sec}s`
    return `${sec}s`
  }

  const p = profile as {
    id: string
    email?: string | null
    full_name?: string | null
    role?: string | null
    created_at?: string | null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/users" className="text-sm text-muted-foreground hover:text-foreground">
          ← Users
        </Link>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-serif text-xl">{p.full_name || p.email || p.id}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Email</span>
            <div>{p.email ?? '—'}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Role</span>
            <div>{p.role ?? '—'}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Created</span>
            <div>{p.created_at ? new Date(p.created_at).toLocaleString() : '—'}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Est. AI USD (90d)</span>
            <div className="tabular-nums">
              {usageSumUsd90d.toLocaleString(undefined, {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 4,
              })}
            </div>
          </div>
          {subscription && (
            <>
              <div>
                <span className="text-muted-foreground">Plan</span>
                <div>{subscription.plan_id ?? '—'}</div>
              </div>
              <div>
                <span className="text-muted-foreground">App AI credits (used / limit)</span>
                <div className="tabular-nums">
                  {subscription.ai_credits_used.toLocaleString()} /{' '}
                  {subscription.ai_credits_limit >= 999999
                    ? '∞'
                    : subscription.ai_credits_limit.toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Credits → USD (display)</span>
                <div className="tabular-nums">
                  {fmtUsd(appCreditsUsdEquivalent)} @ {fmtUsd(appCreditUsdRate)} / credit
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Messages sent (subscription counter)</span>
                <div className="tabular-nums">{subscription.messages_sent.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Message send events (90d audit)</span>
                <div className="tabular-nums">{messageSendEvents90d.toLocaleString()}</div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Divine voice time (90d, UTC days)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Idle</span>
            <div className="tabular-nums">{fmtMs(voiceState90d.idle)}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Working (tools)</span>
            <div className="tabular-nums">{fmtMs(voiceState90d.working)}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Speaking (assistant audio)</span>
            <div className="tabular-nums">{fmtMs(voiceState90d.speaking)}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Total connected (sum of states)</span>
            <div className="tabular-nums">{fmtMs(voiceState90d.total)}</div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">AI usage webhook (per user)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            OpenAI / xAI do not expose per-creator webhooks on a shared API key. We POST each logged{' '}
            <code className="text-xs">ai.usage</code> event to your HTTPS URL; optional HMAC in{' '}
            <code className="text-xs">X-Creatix-Signature: sha256=…</code> when a secret is set.
          </p>
          {usageWebhook && (
            <p className="text-xs">
              Current: {usageWebhook.enabled ? 'on' : 'off'} ·{' '}
              <span className="break-all text-foreground">{usageWebhook.url}</span>
            </p>
          )}
          <AdminUserUsageWebhookForm
            userId={p.id}
            initial={usageWebhook ? { url: usageWebhook.url, enabled: usageWebhook.enabled } : null}
          />
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Platform connections</CardTitle>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No platform_connections rows.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {connections.map((c) => {
                const row = c as {
                  platform: string
                  is_connected: boolean | null
                  platform_username: string | null
                  last_sync_at: string | null
                }
                return (
                  <li key={row.platform}>
                    <Badge variant={row.is_connected ? 'default' : 'secondary'} className="gap-1">
                      {row.platform}
                      {row.is_connected ? ' · on' : ' · off'}
                      {row.platform_username ? ` · @${row.platform_username}` : ''}
                    </Badge>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">By feature (90d)</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[280px] overflow-auto p-0 sm:p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead className="text-right">USD</TableHead>
                  <TableHead className="text-right">Events</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageByFeature90d.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      No events.
                    </TableCell>
                  </TableRow>
                ) : (
                  usageByFeature90d.map((r) => (
                    <TableRow key={r.feature}>
                      <TableCell className="max-w-[180px] truncate font-mono text-xs">{r.feature}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{fmtUsd(r.estimated_usd)}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{r.events}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">By provider (90d)</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[280px] overflow-auto p-0 sm:p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">USD</TableHead>
                  <TableHead className="text-right">Events</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageByProvider90d.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      No events.
                    </TableCell>
                  </TableRow>
                ) : (
                  usageByProvider90d.map((r) => (
                    <TableRow key={r.bucket}>
                      <TableCell className="text-xs">{r.label}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{fmtUsd(r.estimated_usd)}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{r.events}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 font-medium">Estimated cost by day (30d)</h2>
        <div className="rounded-md border border-border p-4">
          <UserUsageChart data={daily} />
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-medium">AI usage events (90d)</h2>
        <div className="max-h-[420px] overflow-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Feature</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">In</TableHead>
                <TableHead className="text-right">Out</TableHead>
                <TableHead className="text-right">Tot</TableHead>
                <TableHead className="text-right">USD</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usage.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground">
                    No events.
                  </TableCell>
                </TableRow>
              ) : (
                usage.map((row) => {
                  const u = row as {
                    id: string
                    created_at: string
                    feature: string
                    provider: string
                    model: string
                    input_tokens: number
                    output_tokens: number
                    total_tokens?: number
                    estimated_usd: number
                  }
                  const tot =
                    u.total_tokens != null
                      ? u.total_tokens
                      : u.input_tokens + u.output_tokens
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(u.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate text-xs">{u.feature}</TableCell>
                      <TableCell className="max-w-[100px] truncate text-xs">{u.provider}</TableCell>
                      <TableCell className="max-w-[160px] truncate text-xs">{u.model}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{u.input_tokens}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{u.output_tokens}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{tot}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {Number(u.estimated_usd).toFixed(6)}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-medium">API errors (90d)</h2>
        <div className="max-h-[320px] overflow-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No errors.
                  </TableCell>
                </TableRow>
              ) : (
                errors.map((row) => {
                  const e = row as {
                    id: string
                    created_at: string
                    route: string
                    http_status: number | null
                    message: string
                    safe_context?: unknown
                    context?: unknown
                  }
                  const ctx = e.safe_context ?? e.context
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(e.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs">{e.route}</TableCell>
                      <TableCell className="text-xs">{e.http_status ?? '—'}</TableCell>
                      <TableCell className="max-w-[360px] text-xs">
                        <div className="truncate">{e.message}</div>
                        {ctx && typeof ctx === 'object' ? (
                          <pre className="mt-1 max-h-20 overflow-auto rounded bg-muted/40 p-1 text-[10px]">
                            {JSON.stringify(ctx).slice(0, 400)}
                          </pre>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
