'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  label: string
  value: string
  hint?: string
  className?: string
}

export function AdminKpiCard({ label, value, hint, className }: Props) {
  return (
    <Card className={cn('border-border bg-card/70', className)}>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="text-xs text-muted-foreground">
          {hint}
        </CardContent>
      ) : null}
    </Card>
  )
}
