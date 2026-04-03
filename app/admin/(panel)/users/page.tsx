import Link from 'next/link'
import { adminDirectoryRows } from '@/lib/admin/queries'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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

  const rows = await adminDirectoryRows({ q, sort, limit: 200 })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground">
          Search profiles, sort by usage (30d) or account metadata. Connection status is on each user&apos;s detail page.
        </p>
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
            <option value="usage">Sort: est. cost (30d)</option>
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
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Est. USD (30d)</TableHead>
              <TableHead className="text-right">Events</TableHead>
              <TableHead className="text-right">Tokens</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No users match.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.user_id}>
                  <TableCell>
                    <Link
                      href={`/admin/users/${r.user_id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {r.full_name || r.email || r.user_id.slice(0, 8)}
                    </Link>
                    {r.email ? <div className="text-xs text-muted-foreground">{r.email}</div> : null}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.role ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(r.estimated_usd_30d).toLocaleString(undefined, {
                      style: 'currency',
                      currency: 'USD',
                      maximumFractionDigits: 4,
                    })}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.events_30d}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.tokens_30d.toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
