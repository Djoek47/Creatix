import { adminRecentErrors } from '@/lib/admin/queries'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type SearchParams = { route?: string }

export default async function AdminErrorsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const sp = (await searchParams) ?? {}
  const routeFilter = typeof sp.route === 'string' ? sp.route : ''
  const rows = await adminRecentErrors(200, routeFilter)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">API errors</h1>
        <p className="text-sm text-muted-foreground">
          api_error_logs (safe_context only — no secrets). Filter by route substring.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-2" action="/admin/errors" method="get">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="route">
            Route contains
          </label>
          <Input id="route" name="route" placeholder="/api/…" defaultValue={routeFilter} className="w-64" />
        </div>
        <Button type="submit" size="sm" variant="secondary">
          Filter
        </Button>
      </form>

      <div className="max-h-[min(70vh,720px)] overflow-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Context</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No errors logged.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const e = row as {
                  id: string
                  created_at: string
                  route: string
                  http_status: number | null
                  user_id: string | null
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
                    <TableCell className="max-w-[120px] truncate font-mono text-xs">
                      {e.user_id ? `${e.user_id.slice(0, 8)}…` : '—'}
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate text-xs">{e.message}</TableCell>
                    <TableCell className="max-w-[200px] text-[10px] text-muted-foreground">
                      {ctx != null ? JSON.stringify(ctx).slice(0, 120) : '—'}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
