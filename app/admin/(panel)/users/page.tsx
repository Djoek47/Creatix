import Link from 'next/link'
import { adminDirectoryRows } from '@/lib/admin/queries'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type SearchParams = { q?: string; sort?: string }

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const sp = (await searchParams) ?? {}
  const q = typeof sp.q === 'string' ? sp.q : ''
  const sortRaw = typeof sp.sort === 'string' ? sp.sort : 'usage'
  const sort = sortRaw === 'created' || sortRaw === 'email' ? sortRaw : 'usage'
  const rows = await adminDirectoryRows({ q, sort, limit: 220 })

  const totalCash = rows.reduce((sum, row) => sum + Number(row.cash_equivalent_usd_30d ?? 0), 0)
  const totalCredits = rows.reduce((sum, row) => sum + Number(row.estimated_credits_30d ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Creators & usage</h1>
        <p className="text-sm text-muted-foreground">
          Discover top credit consumers, margin-sensitive creators, and user-level service usage trends.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Creators shown</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl tabular-nums">{rows.length.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Modeled credits (30d)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl tabular-nums">
            {totalCredits.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Modeled cash eq. (30d)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl tabular-nums">
            {totalCash.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })}
          </CardContent>
        </Card>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-center" action="/admin/users" method="get">
        <Input name="q" placeholder="Search email or name…" defaultValue={q} className="max-w-md" />
        <div className="flex flex-wrap items-center gap-2">
          <select
            name="sort"
            defaultValue={sort}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            aria-label="Sort by"
          >
            <option value="usage">Sort: modeled usage (30d)</option>
            <option value="created">Sort: created (newest)</option>
            <option value="email">Sort: email</option>
          </select>
          <Button type="submit" size="sm" variant="secondary">
            Apply
          </Button>
        </div>
      </form>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Creator</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Provider USD (30d)</TableHead>
              <TableHead className="text-right">Credits (30d)</TableHead>
              <TableHead className="text-right">Cash Eq. (30d)</TableHead>
              <TableHead className="text-right">Events</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No users match.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.user_id}>
                  <TableCell>
                    <Link href={`/admin/users/${r.user_id}`} className="font-medium text-primary hover:underline">
                      {r.full_name || r.email || r.user_id.slice(0, 8)}
                    </Link>
                    {r.email ? <div className="text-xs text-muted-foreground">{r.email}</div> : null}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.role ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(r.estimated_usd_30d).toLocaleString(undefined, {
                      style: 'currency',
                      currency: 'USD',
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(r.estimated_credits_30d).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(r.cash_equivalent_usd_30d).toLocaleString(undefined, {
                      style: 'currency',
                      currency: 'USD',
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.events_30d.toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
