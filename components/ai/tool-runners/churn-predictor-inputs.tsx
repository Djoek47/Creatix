'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  UserRound,
  MessagesSquare,
  ArrowRight,
  CalendarClock,
  LayoutGrid,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ChurnFanPickerRow } from '@/lib/crm/fetch-crm-fans-client'
import type { CrmFansResponse } from '@/lib/crm/crm-fan-types'
import { cn } from '@/lib/utils'

export type ChurnPredictorRunnerInputsProps = {
  easy: boolean
  churnFanId: string
  setChurnFanId: (v: string) => void
  churnFans: ChurnFanPickerRow[]
  churnFansFiltered: ChurnFanPickerRow[]
  churnExpiringOnly: boolean
  setChurnExpiringOnly: (v: boolean) => void
  fanMessage: string
  setFanMessage: (v: string | React.SetStateAction<string>) => void
  contentDescription: string
  setContentDescription: (v: string | React.SetStateAction<string>) => void
  crmFansMeta: CrmFansResponse['meta'] | null
}

const selectTriggerClass =
  'h-11 w-full rounded-xl border-border/45 bg-background/70 text-left text-[14px] font-normal shadow-none'

const sectionShell = 'rounded-2xl border border-border/35 bg-card/45 p-4 shadow-sm dark:border-border/25 dark:bg-card/35 sm:p-5'

const kicker = 'text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground'

function QuickLink({
  href,
  icon: Icon,
  label,
  sub,
}: {
  href: string
  icon: typeof LayoutGrid
  label: string
  sub: string
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-[min(100%,11rem)] flex-1 items-start gap-2.5 rounded-xl border border-border/35 bg-background/50 px-3 py-2.5 text-left transition-colors hover:border-primary/35 hover:bg-primary/[0.04] sm:min-w-0 sm:flex-initial"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-muted/30 text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-[13px] font-medium text-foreground">
          {label}
          <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{sub}</span>
      </span>
    </Link>
  )
}

export function ChurnPredictorRunnerInputs({
  easy,
  churnFanId,
  setChurnFanId,
  churnFans,
  churnFansFiltered,
  churnExpiringOnly,
  setChurnExpiringOnly,
  fanMessage,
  setFanMessage,
  contentDescription,
  setContentDescription,
  crmFansMeta,
}: ChurnPredictorRunnerInputsProps) {
  const t = useTranslations('ai-tools.runners.churn-predictor')
  const ts = useTranslations('ai-tools.runners.shared')

  if (easy) {
    return (
      <div className="space-y-5">
        <p className="text-[14px] leading-relaxed text-muted-foreground">{t('easyIntro')}</p>
        <div className={cn(sectionShell, 'space-y-3')}>
          <p className={kicker}>{t('kickerFan')}</p>
          <Select value={churnFanId} onValueChange={setChurnFanId}>
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder={ts('chooseFan')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">{t('manualTypeDetails')}</SelectItem>
              {churnFans.map((f) => (
                <SelectItem key={`${f.platform}-${f.id}`} value={f.id}>
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    <span className="rounded border border-border px-1 py-0 text-[10px] uppercase text-muted-foreground">
                      {f.platform === 'onlyfans' ? 'OnlyFans' : f.platform === 'fansly' ? 'Fansly' : f.platform}
                    </span>
                    <span>
                      @{f.username}
                      {f.display_name ? ` (${f.display_name})` : ''} · {Number(f.total_spent ?? 0).toFixed(0)}{' '}
                      {ts('spendSuffix')}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {churnFans.length === 0 ? <p className="text-[12px] text-muted-foreground">{t('noFansLoaded')}</p> : null}
        </div>
        {churnFanId === 'manual' ? (
          <div className={cn(sectionShell, 'space-y-2')}>
            <p className={kicker}>{t('kickerDescribe')}</p>
            <Textarea
              placeholder={t('describeFanPlaceholder')}
              value={fanMessage}
              onChange={(e) => setFanMessage(e.target.value)}
              className="min-h-[88px] rounded-xl border-border/45 bg-background/70 text-[14px]"
            />
          </div>
        ) : null}
        <div className={cn(sectionShell, 'space-y-2')}>
          <p className={kicker}>{t('kickerOptional')}</p>
          <Textarea
            placeholder={t('optionalPlaceholder')}
            value={contentDescription}
            onChange={(e) => setContentDescription(e.target.value)}
            className="min-h-[72px] rounded-xl border-border/45 bg-background/70 text-[14px]"
          />
        </div>
        <p className="text-center text-[11px] text-muted-foreground">{t('easyProFootnote')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <QuickLink
          href="/dashboard/retention/churn"
          icon={LayoutGrid}
          label={t('linkBatchLabel')}
          sub={t('linkBatchSub')}
        />
        <QuickLink
          href="/dashboard/retention/tease"
          icon={CalendarClock}
          label={t('linkCalendarLabel')}
          sub={t('linkCalendarSub')}
        />
        <QuickLink
          href="/dashboard/messages"
          icon={MessagesSquare}
          label={t('linkMessagesLabel')}
          sub={t('linkMessagesSub')}
        />
      </div>

      <p className="text-[14px] leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">{t('proIntroLead')}</span>
        {t('proIntroRest')}
      </p>

      <div className={sectionShell}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
            <UserRound className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <p className={kicker}>{t('step1Kicker')}</p>
              <p className="mt-1 text-[13px] font-medium text-foreground">{t('step1Title')}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{t('step1Body')}</p>
            </div>

            <div className="rounded-xl border border-border/25 bg-muted/[0.06] px-3 py-3 dark:bg-muted/[0.08]">
              <div className="flex gap-3">
                <Checkbox
                  id="churn-expiring-only"
                  checked={churnExpiringOnly}
                  onCheckedChange={(v) => setChurnExpiringOnly(v === true)}
                  className="mt-0.5 border-border/60 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                />
                <Label htmlFor="churn-expiring-only" className="cursor-pointer text-[13px] font-normal leading-snug">
                  {t('expiringCheckbox')}
                  <span className="mt-0.5 block text-[12px] text-muted-foreground">{t('expiringCheckboxHint')}</span>
                </Label>
              </div>
            </div>

            <Select value={churnFanId} onValueChange={setChurnFanId}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder={ts('selectFan')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">{t('manualEntryOnly')}</SelectItem>
                {churnFansFiltered.map((f) => (
                  <SelectItem key={`${f.platform}-${f.id}`} value={f.id}>
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <span className="rounded border border-border px-1 py-0 text-[10px] uppercase text-muted-foreground">
                        {f.platform === 'onlyfans' ? 'OnlyFans' : f.platform === 'fansly' ? 'Fansly' : f.platform}
                      </span>
                      <span>
                        @{f.username}
                        {f.display_name ? ` (${f.display_name})` : ''} · {Number(f.total_spent ?? 0).toFixed(0)}{' '}
                        {ts('spendSuffix')}
                        {f.subscription_expires_at
                          ? ` · ${ts('endsPrefix')} ${f.subscription_expires_at.slice(0, 10)}`
                          : ''}
                        {f._source !== 'database' ? ` · ${ts('liveListSuffix')}` : ''}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {crmFansMeta?.warnings?.length ? (
              <Alert className="border-amber-500/35 bg-amber-500/[0.07] dark:bg-amber-500/[0.09]">
                <AlertDescription className="text-[13px] leading-relaxed text-amber-950 dark:text-amber-100">
                  {crmFansMeta.warnings.join(' ')}
                </AlertDescription>
              </Alert>
            ) : null}

            {!churnExpiringOnly && churnFansFiltered.length === 0 ? (
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                {crmFansMeta == null
                  ? t('fansCouldNotLoad')
                  : crmFansMeta.onlyFansConnected || crmFansMeta.fanslyConnected
                    ? t('noCrmYet')
                    : t('connectOrManual')}
              </p>
            ) : null}
            {churnExpiringOnly && churnFansFiltered.length === 0 ? (
              <p className="text-[12px] leading-relaxed text-muted-foreground">{t('noExpiringMatches')}</p>
            ) : null}
          </div>
        </div>
      </div>

      <Separator className="bg-border/50" />

      <div className={sectionShell}>
        <p className={kicker}>{t('step2Kicker')}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{t('step2Intro')}</p>

        <div className="mt-4 space-y-4">
          {churnFanId === 'manual' ? (
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-foreground" htmlFor="churn-manual-fan">
                {t('fanDetailsLabel')}
              </Label>
              <p className="text-[12px] text-muted-foreground">{t('fanDetailsHint')}</p>
              <Textarea
                id="churn-manual-fan"
                placeholder={t('fanDetailsPlaceholder')}
                value={fanMessage}
                onChange={(e) => setFanMessage(e.target.value)}
                className="min-h-[120px] rounded-xl border-border/45 bg-background/70 text-[14px]"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-foreground" htmlFor="churn-spend-notes">
                {t('spendTrendLabel')}
              </Label>
              <p className="text-[12px] text-muted-foreground">{t('spendTrendHint')}</p>
              <Textarea
                id="churn-spend-notes"
                placeholder={t('spendTrendPlaceholder')}
                value={fanMessage}
                onChange={(e) => setFanMessage(e.target.value)}
                className="min-h-[88px] rounded-xl border-border/45 bg-background/70 text-[14px]"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[13px] font-medium text-foreground" htmlFor="churn-behavior">
              {t('recentBehaviorLabel')}
            </Label>
            <p className="text-[12px] text-muted-foreground">{t('recentBehaviorHint')}</p>
            <Textarea
              id="churn-behavior"
              placeholder={t('recentBehaviorPlaceholder')}
              value={contentDescription}
              onChange={(e) => setContentDescription(e.target.value)}
              className="min-h-[88px] rounded-xl border-border/45 bg-background/70 text-[14px]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
