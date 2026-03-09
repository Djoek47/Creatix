'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RevenueAmount } from '@/lib/revenue-privacy-context'

interface AnalyticsRevenueStatProps {
  total: number
}

export function AnalyticsRevenueStat({ total }: AnalyticsRevenueStatProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardDescription>Total Revenue (30d)</CardDescription>
        <CardTitle className="text-3xl">
          <RevenueAmount value={total} />
        </CardTitle>
      </CardHeader>
    </Card>
  )
}
