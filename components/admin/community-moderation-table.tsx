'use client'

import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { CommunityTipModerationRow } from '@/lib/admin/queries'
import { cn } from '@/lib/utils'

type ModerationStatus = 'pending' | 'approved' | 'rejected'

type Props = {
  initialRows: CommunityTipModerationRow[]
  initialStatus: 'pending' | 'approved' | 'rejected' | 'all'
}

export function CommunityModerationTable({ initialRows, initialStatus }: Props) {
  const [rows, setRows] = useState(initialRows)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState(initialStatus)

  const visibleRows = useMemo(() => {
    if (statusFilter === 'all') return rows
    return rows.filter((row) => row.status === statusFilter)
  }, [rows, statusFilter])

  async function updateStatus(id: string, status: ModerationStatus) {
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/community/tips/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof payload.error === 'string' ? payload.error : 'Update failed.')
        return
      }
      setRows((prev) =>
        prev.map((row) =>
          row.id === id
            ? { ...row, status, updated_at: payload.tip?.updated_at ?? row.updated_at }
            : row,
        ),
      )
    } catch {
      setError('Update failed.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Status:</span>
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
          <Button
            key={status}
            size="sm"
            variant={statusFilter === status ? 'default' : 'outline'}
            onClick={() => setStatusFilter(status)}
          >
            {status}
          </Button>
        ))}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="max-h-[70vh] overflow-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Submission</TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No community requests in this filter.
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row) => {
                const busy = busyId === row.id
                return (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[420px]">
                      <p className="truncate font-medium">{row.title}</p>
                      <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">
                        {row.body}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="truncate">{row.author_name ?? 'Creator'}</div>
                      <div className="truncate text-muted-foreground">{row.author_email ?? row.user_id}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          row.status === 'approved' && 'bg-emerald-500/20 text-emerald-100',
                          row.status === 'rejected' && 'bg-red-500/20 text-red-100',
                          row.status === 'pending' && 'bg-amber-500/20 text-amber-100',
                        )}
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void updateStatus(row.id, 'approved')}
                        >
                          {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void updateStatus(row.id, 'rejected')}
                        >
                          Reject
                        </Button>
                      </div>
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
