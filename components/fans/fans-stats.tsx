'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Users, Crown, DollarSign, Activity } from 'lucide-react'
import { RevenueAmount } from '@/lib/revenue-privacy-context'

interface FansStatsProps {
  stats: {
    totalFans: number
    whales: number
    totalRevenue: number
    activeFans: number
  }
}

export function FansStats({ stats }: FansStatsProps) {
  const cards = [
    { title: 'Total Fans', value: stats.totalFans.toLocaleString(), revenue: false as const, icon: Users, color: 'text-chart-1', bgColor: 'bg-chart-1/10' },
    { title: 'Whale Tier', value: stats.whales.toLocaleString(), revenue: false as const, icon: Crown, color: 'text-chart-4', bgColor: 'bg-chart-4/10' },
    { title: 'Total Revenue', value: stats.totalRevenue, revenue: true as const, icon: DollarSign, color: 'text-chart-2', bgColor: 'bg-chart-2/10' },
    { title: 'Active Fans', value: stats.activeFans.toLocaleString(), revenue: false as const, icon: Activity, color: 'text-chart-5', bgColor: 'bg-chart-5/10' },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className={`rounded-lg p-3 ${card.bgColor}`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{card.title}</p>
              <p className="text-xl font-bold">
                {card.revenue ? <RevenueAmount value={card.value as number} /> : card.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
