import Link from 'next/link'
import { adminListUnitCosts, adminRecentAuditLog } from '@/lib/admin/queries'
import { UnitCostRowForm } from '@/components/admin/unit-cost-row-form'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

export default async function AdminSettingsPage() {
  const [rows, audit] = await Promise.all([adminListUnitCosts(), adminRecentAuditLog(60)])

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Admin settings</h1>
          <p className="text-sm text-muted-foreground">
            Pricing assumptions (USD per 1M tokens) feed <code className="text-xs">estimated_usd</code> on{' '}
            <code className="text-xs">ai_usage_events</code>. Internal reporting only unless product ties billing here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/analytics">Usage analytics</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/simulator">Simulator</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/api/admin/export/usage?days=30" target="_blank" rel="noreferrer">
              Export usage CSV (30d)
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/api/admin/export/usage?days=90" target="_blank" rel="noreferrer">
              Export 90d
            </a>
          </Button>
        </div>
      </div>

      <section>
        <h2 className="mb-3 font-medium">Unit costs</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Run <code className="text-xs">scripts/062_admin_usage_monitoring.sql</code> then{' '}
          <code className="text-xs">063_admin_cc_schema_enhancements.sql</code> if missing columns.{' '}
          <Link href="/admin" className="text-primary underline">
            Overview
          </Link>
        </p>
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model key</TableHead>
                <TableHead>Display name</TableHead>
                <TableHead className="text-right">$/1M in</TableHead>
                <TableHead className="text-right">$/1M out</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No rows — apply SQL migrations (062, 063).
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const r = row as {
                    model_key: string
                    display_name: string | null
                    usd_per_1m_input: number | string
                    usd_per_1m_output: number | string
                    effective_from?: string | null
                  }
                  return (
                    <TableRow key={r.model_key}>
                      <TableCell className="align-top font-mono text-xs">{r.model_key}</TableCell>
                      <TableCell colSpan={4} className="p-2">
                        <div className="mb-2 text-[10px] text-muted-foreground">
                          {r.effective_from
                            ? `Effective from: ${new Date(r.effective_from).toLocaleString()}`
                            : null}
                        </div>
                        <UnitCostRowForm row={r} />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-medium">Audit log</h2>
        <p className="mb-4 text-xs text-muted-foreground">Recent admin actions (cost edits, etc.).</p>
        <div className="max-h-[360px] overflow-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No audit entries yet.
                  </TableCell>
                </TableRow>
              ) : (
                audit.map((row) => {
                  const a = row as {
                    id: string
                    created_at: string
                    admin_user_id: string
                    action: string
                    target_user_id: string | null
                  }
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(a.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{a.admin_user_id.slice(0, 8)}…</TableCell>
                      <TableCell className="text-xs">{a.action}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {a.target_user_id ? `${a.target_user_id.slice(0, 8)}…` : '—'}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
