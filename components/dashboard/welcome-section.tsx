'use client'

import { RevenueAmount } from '@/lib/revenue-privacy-context'

interface WelcomeSectionProps {
  userName: string
  progress: { label: string; value: number; max?: number; revenue?: boolean }[]
  kpis: { value: string | number; label: string; revenue?: boolean }[]
}

export function WelcomeSection({ userName, progress, kpis }: WelcomeSectionProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Welcome — Visual copy */}
      <div className="text-center space-y-3">
        <h2 className="font-title text-3xl font-bold text-foreground">
          Welcome back, {userName}!
        </h2>
        <p className="text-lg text-muted-foreground">Here&apos;s your creator dashboard.</p>
      </div>

      {/* Progress bars — gold-to-purple animated fill */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {progress.map((p) => {
          const pct = p.max && p.max > 0 ? Math.min(100, (p.value / p.max) * 100) : (typeof p.value === 'number' ? p.value : 0)
          return (
            <div key={p.label} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{p.label}</span>
                <span className="font-medium text-foreground">
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

      {/* Quick Stats — brand cards */}
      <div className="grid grid-cols-3 gap-4">
        {kpis.map((kpi, i) => (
          <div key={kpi.label} className="brand-card p-4 text-center">
            <div className={`text-2xl font-bold ${i === 0 ? 'text-primary' : i === 1 ? 'text-accent' : 'text-primary'}`}>
              {kpi.revenue ? <RevenueAmount value={kpi.value as number} /> : kpi.value}
            </div>
            <div className="text-sm text-muted-foreground">{kpi.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
