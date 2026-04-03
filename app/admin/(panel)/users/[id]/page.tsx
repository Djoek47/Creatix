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
import { Badge } from '@/components/ui/badge'

type Props = { params: Promise<{ id: string }> }

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params
  const [{ profile, usage, errors, usageSumUsd90d }, connections, daily] = await Promise.all([
    adminUserDetail(id),
    adminUserPlatformConnections(id),
    adminUserUsageDailySeries(id, 30),
  ])

  if (!profile) notFound()

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
                  <TableCell colSpan={7} className="text-muted-foreground">
                    No events.
                  </TableCell>
                </TableRow>
              ) : (
                usage.map((row) => {
                  const u = row as {
                    id: string
                    created_at: string
                    feature: string
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
