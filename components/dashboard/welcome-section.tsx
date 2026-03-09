'use client'

import { RevenueAmount } from '@/lib/revenue-privacy-context'
import { cn } from '@/lib/utils'

interface WelcomeSectionProps {
  userName: string
  progress: { label: string; value: number; max?: number; revenue?: boolean }[]
  kpis: { value: string | number; label: string; revenue?: boolean }[]
}

export function WelcomeSection({ userName, progress, kpis }: WelcomeSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-title text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome in, {userName}
        </h1>
        {/* Progress bars — gold-to-purple animated fill */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {progress.map((p) => {
            const pct = p.max && p.max > 0 ? Math.min(100, (p.value / p.max) * 100) : (typeof p.value === 'number' ? p.value : 0)
            return (
              <div key={p.label} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{p.label}</span>
                  <span className="font-medium">
                    {p.revenue ? <RevenueAmount value={p.value as number} /> : `${Math.round(pct)}%`}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full animate-progress-gold-purple"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* KPI strip — large numbers with gold gradient, gold-to-purple animation */}
      <div className="grid grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="relative overflow-hidden rounded-2xl border border-border bg-card/80 p-6 transition-brand animate-gold-purple-gradient"
          >
            <p className="text-2xl font-bold sm:text-3xl">
              {kpi.revenue ? <RevenueAmount value={kpi.value as number} /> : kpi.value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
