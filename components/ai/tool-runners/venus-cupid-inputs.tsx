'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Checkbox } from '@/components/ui/checkbox'

export type VenusCupidRunnerInputsProps = {
  easy: boolean
  cupidTagChurn: boolean
  setCupidTagChurn: (v: boolean) => void
}

export function VenusCupidRunnerInputs({ easy, cupidTagChurn, setCupidTagChurn }: VenusCupidRunnerInputsProps) {
  const t = useTranslations('ai-tools.runners.venus-cupid')
  const linkClass = 'text-primary underline hover:no-underline'

  if (easy) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('easyIntro')}</p>
        <div className="flex items-start gap-2 rounded-lg border border-border p-3">
          <Checkbox
            id="cupid-churn-tag-easy"
            checked={cupidTagChurn}
            onCheckedChange={(v) => setCupidTagChurn(v === true)}
          />
          <label htmlFor="cupid-churn-tag-easy" className="cursor-pointer text-sm text-muted-foreground">
            {t('easyChurnTag')}
          </label>
        </div>
        <p className="text-[11px] text-muted-foreground">{t('easyProHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t.rich('proIntroRich', {
          gen: (chunks) => <strong className="text-foreground">{chunks}</strong>,
          newest: (chunks) => <strong className="text-foreground">{chunks}</strong>,
          retention: (chunks) => (
            <Link href="/dashboard/retention/churn" className={linkClass}>
              {chunks}
            </Link>
          ),
          churn: (chunks) => (
            <Link href="/dashboard/ai-studio/tools/churn-predictor" className={linkClass}>
              {chunks}
            </Link>
          ),
        })}
      </p>
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
        <Checkbox id="cupid-churn-tag" checked={cupidTagChurn} onCheckedChange={(v) => setCupidTagChurn(v === true)} />
        <label htmlFor="cupid-churn-tag" className="cursor-pointer text-xs leading-snug text-muted-foreground">
          {t.rich('proChurnTagRich', {
            bold: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
            saved: (chunks) => <strong className="text-foreground">{chunks}</strong>,
          })}
        </label>
      </div>
    </div>
  )
}
