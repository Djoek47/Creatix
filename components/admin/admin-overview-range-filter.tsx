'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const PRESETS = [
  { range: 'live', label: 'Live (60m)' },
  { range: 'today', label: 'Today (UTC)' },
  { range: '24h', label: '24h' },
  { range: '7d', label: '7d' },
  { range: '30d', label: '30d' },
] as const

export function AdminOverviewRangeFilter() {
  const router = useRouter()
  const sp = useSearchParams()
  const current = sp.get('range') ?? '30d'
  const day = sp.get('day') ?? ''

  function go(next: { range?: string; day?: string | null }) {
    const p = new URLSearchParams(sp.toString())
    if (next.range != null) {
      p.set('range', next.range)
      p.delete('day')
    }
    if (next.day === null) {
      p.delete('day')
    } else if (next.day !== undefined && next.day !== '') {
      p.set('day', next.day)
      p.delete('range')
    }
    router.push(`/admin?${p.toString()}`)
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card/40 p-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Quick range</p>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <Button
              key={p.range}
              type="button"
              variant={current === p.range && !day ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => go({ range: p.range })}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="admin-day">
            UTC day
          </label>
          <Input
            id="admin-day"
            type="date"
            className="h-8 w-[150px] text-xs"
            value={day}
            onChange={(e) => {
              const v = e.target.value
              if (!v) go({ range: current || '30d', day: null })
              else go({ day: v })
            }}
          />
        </div>
        {(day || current !== '30d') && (
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => go({ range: '30d', day: null })}>
            Reset 30d
          </Button>
        )}
      </div>
    </div>
  )
}
