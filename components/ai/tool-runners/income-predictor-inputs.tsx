'use client'

import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type IncomePredictorRunnerInputsProps = {
  easy: boolean
  incomePredictorMode: 'maintain' | 'grow'
  setIncomePredictorMode: (v: 'maintain' | 'grow') => void
  incomePredictorGoal: string
  setIncomePredictorGoal: (v: string) => void
  incomeCalendarMode: 'week' | 'month'
  setIncomeCalendarMode: (v: 'week' | 'month') => void
}

export function IncomePredictorRunnerInputs({
  easy,
  incomePredictorMode,
  setIncomePredictorMode,
  incomePredictorGoal,
  setIncomePredictorGoal,
  incomeCalendarMode,
  setIncomeCalendarMode,
}: IncomePredictorRunnerInputsProps) {
  if (easy) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Quick read on next-month outlook from your synced data. Full charts live on{' '}
          <Link className="text-primary underline-offset-2 hover:underline" href="/dashboard/analytics/income-predictor">
            Income Predictor
          </Link>
          .
        </p>
        <div className="space-y-2">
          <Label>Focus</Label>
          <Select value={incomePredictorMode} onValueChange={(v) => setIncomePredictorMode(v as 'maintain' | 'grow')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="maintain">Keep my current pace</SelectItem>
              <SelectItem value="grow">Push for more next month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {incomePredictorMode === 'grow' ? (
          <div className="space-y-2">
            <Label>Target (USD, optional)</Label>
            <Input
              inputMode="decimal"
              placeholder="e.g. 12000"
              value={incomePredictorGoal}
              onChange={(e) => setIncomePredictorGoal(e.target.value)}
            />
          </div>
        ) : null}
        <p className="text-[11px] text-muted-foreground">Pro mode: weekly vs monthly calendar buckets and full context copy.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-snug">
        Combines the partner revenue forecast with your synced snapshots, post cadence, and goal realism. For the full
        calendar and raw forecast JSON, open{' '}
        <Link className="text-primary underline-offset-2 hover:underline" href="/dashboard/analytics/income-predictor">
          Income Predictor
        </Link>
        .
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Calendar buckets</Label>
          <Select value={incomeCalendarMode} onValueChange={(v) => setIncomeCalendarMode(v as 'week' | 'month')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Mode</Label>
          <Select value={incomePredictorMode} onValueChange={(v) => setIncomePredictorMode(v as 'maintain' | 'grow')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="maintain">Maintain run rate</SelectItem>
              <SelectItem value="grow">Grow (next month $)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {incomePredictorMode === 'grow' ? (
        <div className="space-y-2">
          <Label>Target revenue (USD)</Label>
          <Input
            inputMode="decimal"
            placeholder="e.g. 12000"
            value={incomePredictorGoal}
            onChange={(e) => setIncomePredictorGoal(e.target.value)}
          />
        </div>
      ) : null}
    </div>
  )
}
