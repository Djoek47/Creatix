'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RetentionContentCalendarCard } from '@/components/retention/retention-content-calendar-card'

const sectionKicker = 'text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/75'

export default function UserRetentionByTeasePage() {
  const t = useTranslations('retention-tease')
  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-16 pt-1 sm:space-y-10 sm:pb-20">
      <header className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1 text-muted-foreground">
          <Link href="/dashboard/retention/churn">
            <ArrowLeft className="h-4 w-4" />
            {t('backToChurn')}
          </Link>
        </Button>
        <p className={sectionKicker}>{t('kicker')}</p>
        <h1 className="text-balance font-sans text-[28px] font-semibold leading-[1.1] tracking-tight text-foreground sm:text-[32px]">
          {t('title')}
        </h1>
        <p className="max-w-prose text-[15px] leading-relaxed text-muted-foreground sm:text-[16px]">{t('subtitle')}</p>
      </header>
      <RetentionContentCalendarCard />
    </div>
  )
}
