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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { IncomePredictorFocusMode } from '@/lib/income-predictor/mode'
import { cn } from '@/lib/utils'

export type IncomePredictorRunnerInputsProps = {
  easy: boolean
  incomePredictorMode: IncomePredictorFocusMode
  setIncomePredictorMode: (v: IncomePredictorFocusMode) => void
  incomePredictorGoal: string
  setIncomePredictorGoal: (v: string) => void
  incomeCalendarMode: 'week' | 'month'
  setIncomeCalendarMode: (v: 'week' | 'month') => void
}

function FocusOption({
  value,
  id,
  title,
  description,
  mode,
}: {
  value: IncomePredictorFocusMode
  id: string
  title: string
  description: string
  mode: IncomePredictorFocusMode
}) {
  const on = mode === value
  return (
    <Label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer gap-3 rounded-xl border px-3.5 py-3 transition-[border-color,background-color] duration-200',
        on
          ? 'border-foreground/18 bg-muted/30 dark:border-white/[0.12] dark:bg-white/[0.04]'
          : 'border-border/45 bg-transparent hover:border-border/70 hover:bg-muted/15',
      )}
    >
      <RadioGroupItem value={value} id={id} className="mt-0.5 shrink-0" />
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="block text-[13px] font-medium leading-snug tracking-tight text-foreground">{title}</span>
        <span className="block text-[12px] leading-relaxed text-muted-foreground/90">{description}</span>
      </span>
    </Label>
  )
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
      <div className="space-y-6">
        <p className="text-[13px] leading-relaxed text-muted-foreground/92">
          Short outlook from synced data and partner forecast.{' '}
          <Link
            className="font-medium text-foreground/80 underline decoration-border/50 underline-offset-4 transition-colors hover:text-foreground"
            href="/dashboard/analytics/income-predictor"
          >
            Full Income Predictor
          </Link>{' '}
          has charts and saved runs.
        </p>

        <div className="space-y-2.5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/75">What to optimize</p>
          <RadioGroup
            value={incomePredictorMode}
            onValueChange={(v) => {
              setIncomePredictorMode(v as IncomePredictorFocusMode)
              if (v !== 'grow') setIncomePredictorGoal('')
            }}
            className="flex flex-col gap-2"
          >
            <FocusOption
              value="maintain"
              id="ip-easy-maintain"
              mode={incomePredictorMode}
              title="Steady pace"
              description="Hold your current monthly run rate—cadence, retention, protection."
            />
            <FocusOption
              value="next_tier"
              id="ip-easy-next"
              mode={incomePredictorMode}
              title="Next tier"
              description="Step to the next revenue band—the same ladder as subscription pricing."
            />
            <FocusOption
              value="grow"
              id="ip-easy-grow"
              mode={incomePredictorMode}
              title="Custom target"
              description="Set an exact next-month revenue number (USD)."
            />
          </RadioGroup>
        </div>

        {incomePredictorMode === 'grow' ? (
          <div className="space-y-1.5">
            <Label htmlFor="ip-easy-goal" className="text-[12px] font-medium text-foreground/90">
              Target (USD / month)
            </Label>
            <Input
              id="ip-easy-goal"
              inputMode="decimal"
              placeholder="e.g. 12,000"
              value={incomePredictorGoal}
              onChange={(e) => setIncomePredictorGoal(e.target.value)}
              className="h-11 rounded-xl border-border/50 bg-background/60 text-[15px] shadow-none"
            />
          </div>
        ) : null}

        <p className="text-[11px] leading-relaxed text-muted-foreground/78">
          Pro mode adds weekly vs monthly calendar buckets and richer forecast context.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-[13px] leading-relaxed text-muted-foreground/92">
        Partner forecast plus your snapshots, cadence, and goal realism. Raw JSON and calendar live in{' '}
        <Link
          className="font-medium text-foreground/80 underline decoration-border/50 underline-offset-4 transition-colors hover:text-foreground"
          href="/dashboard/analytics/income-predictor"
        >
          Income Predictor
        </Link>
        .
      </p>

      <div className="space-y-2">
        <Label className="text-[12px] font-medium text-foreground/85">Calendar buckets</Label>
        <Select value={incomeCalendarMode} onValueChange={(v) => setIncomeCalendarMode(v as 'week' | 'month')}>
          <SelectTrigger className="h-11 max-w-md rounded-xl border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Monthly</SelectItem>
            <SelectItem value="week">Weekly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2.5">
        <Label className="text-[12px] font-medium text-foreground/85">Focus</Label>
        <RadioGroup
          value={incomePredictorMode}
          onValueChange={(v) => {
            setIncomePredictorMode(v as IncomePredictorFocusMode)
            if (v !== 'grow') setIncomePredictorGoal('')
          }}
          className="flex flex-col gap-2"
        >
          <FocusOption
            value="maintain"
            id="ip-pro-maintain"
            mode={incomePredictorMode}
            title="Steady pace"
            description="Maintain current run rate."
          />
          <FocusOption
            value="next_tier"
            id="ip-pro-next"
            mode={incomePredictorMode}
            title="Next tier"
            description="Next revenue band from your current estimate."
          />
          <FocusOption
            value="grow"
            id="ip-pro-grow"
            mode={incomePredictorMode}
            title="Custom target"
            description="Specify next-month revenue in USD."
          />
        </RadioGroup>
      </div>

      {incomePredictorMode === 'grow' ? (
        <div className="space-y-1.5">
          <Label htmlFor="ip-pro-goal" className="text-[12px] font-medium text-foreground/90">
            Target revenue (USD / month)
          </Label>
          <Input
            id="ip-pro-goal"
            inputMode="decimal"
            placeholder="e.g. 12000"
            value={incomePredictorGoal}
            onChange={(e) => setIncomePredictorGoal(e.target.value)}
            className="h-11 max-w-md rounded-xl border-border/50 bg-background/60 text-[15px] shadow-none"
          />
        </div>
      ) : null}
    </div>
  )
}
