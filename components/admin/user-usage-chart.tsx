'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { UsageDailyPoint } from '@/lib/admin/queries'

export function UserUsageChart({ data }: { data: UsageDailyPoint[] }) {
  if (!data.length) {
    return <p className="text-sm text-muted-foreground">No daily usage in this window.</p>
  }

  const chartData = data.map((d) => ({
    ...d,
    label: d.day.slice(5),
  }))

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
          />
          <Tooltip
            formatter={(value) => [`$${Number(value).toFixed(4)}`, 'Est. USD']}
            labelFormatter={(label, payload) => {
              const day = (payload?.[0]?.payload as { day?: string } | undefined)?.day
              return day ?? String(label)
            }}
            contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          />
          <Bar dataKey="estimated_usd" fill="oklch(0.65 0.16 85 / 0.85)" radius={[4, 4, 0, 0]} name="USD" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
