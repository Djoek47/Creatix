'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('ai-tools.runners.income-predictor')
  const linkClass =
    'font-medium text-foreground/80 underline decoration-border/50 underline-offset-4 transition-colors hover:text-foreground'

  if (easy) {
    return (
      <div className="space-y-6">
        <p className="text-[13px] leading-relaxed text-muted-foreground/92">
          {t.rich('easyIntroRich', {
            link: (chunks) => (
              <Link className={linkClass} href="/dashboard/analytics/income-predictor">
                {chunks}
              </Link>
            ),
          })}
        </p>

        <div className="space-y-2.5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/75">{t('whatToOptimize')}</p>
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
              title={t('maintainTitle')}
              description={t('maintainDescEasy')}
            />
            <FocusOption
              value="next_tier"
              id="ip-easy-next"
              mode={incomePredictorMode}
              title={t('nextTierTitle')}
              description={t('nextTierDescEasy')}
            />
            <FocusOption
              value="grow"
              id="ip-easy-grow"
              mode={incomePredictorMode}
              title={t('growTitle')}
              description={t('growDescEasy')}
            />
          </RadioGroup>
        </div>

        {incomePredictorMode === 'grow' ? (
          <div className="space-y-1.5">
            <Label htmlFor="ip-easy-goal" className="text-[12px] font-medium text-foreground/90">
              {t('targetUsdMonth')}
            </Label>
            <Input
              id="ip-easy-goal"
              inputMode="decimal"
              placeholder={t('targetPlaceholder')}
              value={incomePredictorGoal}
              onChange={(e) => setIncomePredictorGoal(e.target.value)}
              className="h-11 rounded-xl border-border/50 bg-background/60 text-[15px] shadow-none"
            />
          </div>
        ) : null}

        <p className="text-[11px] leading-relaxed text-muted-foreground/78">{t('easyProHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-[13px] leading-relaxed text-muted-foreground/92">
        {t.rich('proIntroRich', {
          link: (chunks) => (
            <Link className={linkClass} href="/dashboard/analytics/income-predictor">
              {chunks}
            </Link>
          ),
        })}
      </p>

      <div className="space-y-2">
        <Label className="text-[12px] font-medium text-foreground/85">{t('calendarBuckets')}</Label>
        <Select value={incomeCalendarMode} onValueChange={(v) => setIncomeCalendarMode(v as 'week' | 'month')}>
          <SelectTrigger className="h-11 max-w-md rounded-xl border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">{t('bucketMonthly')}</SelectItem>
            <SelectItem value="week">{t('bucketWeekly')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2.5">
        <Label className="text-[12px] font-medium text-foreground/85">{t('focusLabel')}</Label>
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
            title={t('maintainTitle')}
            description={t('maintainDescPro')}
          />
          <FocusOption
            value="next_tier"
            id="ip-pro-next"
            mode={incomePredictorMode}
            title={t('nextTierTitle')}
            description={t('nextTierDescPro')}
          />
          <FocusOption
            value="grow"
            id="ip-pro-grow"
            mode={incomePredictorMode}
            title={t('growTitle')}
            description={t('growDescPro')}
          />
        </RadioGroup>
      </div>

      {incomePredictorMode === 'grow' ? (
        <div className="space-y-1.5">
          <Label htmlFor="ip-pro-goal" className="text-[12px] font-medium text-foreground/90">
            {t('targetRevenueUsd')}
          </Label>
          <Input
            id="ip-pro-goal"
            inputMode="decimal"
            placeholder={t('targetPlaceholderPro')}
            value={incomePredictorGoal}
            onChange={(e) => setIncomePredictorGoal(e.target.value)}
            className="h-11 max-w-md rounded-xl border-border/50 bg-background/60 text-[15px] shadow-none"
          />
        </div>
      ) : null}
    </div>
  )
}
