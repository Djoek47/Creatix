'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2, Minus, Plus } from 'lucide-react'

import type { FanClassifySegmentKey } from '@/lib/divine-manager'
import { fanClassifyListShortName } from '@/lib/divine-manager'
import {
  parseClassifySyncDetails,
  summarizeClassifyDetails,
  type ParsedClassifyLine,
  type ClassifyDetailChannel,
} from '@/lib/fan-classify/parse-classify-details'
import { cn } from '@/lib/utils'

const SEGMENT_KEYS = new Set<string>([
  'whale_spend',
  'active_chatter',
  'cold',
  'freeloader_new',
  'freeloader_mature',
  'spenders',
  'subscriber_no_extra',
  'recent_sub_3d',
])

function segmentLabel(segmentKey: string, tSeg: (k: string) => string): string {
  if (segmentKey === 'active_chat') {
    return tSeg('active_chat')
  }
  if (SEGMENT_KEYS.has(segmentKey)) {
    const key = segmentKey as FanClassifySegmentKey
    const tr = tSeg(key)
    if (tr && tr !== key) return tr
    return fanClassifyListShortName(key)
  }
  return segmentKey.replace(/_/g, ' ')
}

function channelLabel(ch: ClassifyDetailChannel, tCh: (k: string) => string): string {
  switch (ch) {
    case 'fansly_tags':
      return tCh('fansly_tags')
    case 'onlyfans_crm':
      return tCh('onlyfans_crm')
    case 'onlyfans_api':
      return tCh('onlyfans_api')
    case 'onlyfans_active_chat':
      return tCh('onlyfans_active_chat')
    default:
      return tCh('unknown')
  }
}

function Pill({ children, tone }: { children: React.ReactNode; tone: 'neutral' | 'fansly' | 'onlyfans' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide',
        tone === 'neutral' && 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400',
        tone === 'fansly' &&
          'bg-violet-500/[0.08] text-violet-700 dark:bg-violet-400/10 dark:text-violet-300/90',
        tone === 'onlyfans' &&
          'bg-sky-500/[0.08] text-sky-800 dark:bg-sky-400/10 dark:text-sky-200/90',
      )}
    >
      {children}
    </span>
  )
}

function channelPill(ch: ClassifyDetailChannel, tCh: (k: string) => string) {
  if (ch === 'fansly_tags') return <Pill tone="fansly">{channelLabel(ch, tCh)}</Pill>
  if (ch === 'unknown') return <Pill tone="neutral">{channelLabel(ch, tCh)}</Pill>
  return <Pill tone="onlyfans">{channelLabel(ch, tCh)}</Pill>
}

function Stat({ icon: Icon, value, label }: { icon: typeof Plus; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 sm:items-start">
      <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-50">
        <Icon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" strokeWidth={2} aria-hidden />
        <span className="text-xl font-semibold tabular-nums tracking-tight">{value}</span>
      </div>
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
        {label}
      </span>
    </div>
  )
}

export function ClassifySyncResultPanel({ details }: { details: string[] }) {
  const t = useTranslations('commenter.classifyResult')
  const tSeg = useTranslations('commenter.classifyResult.segments')
  const tCh = useTranslations('commenter.classifyResult.channels')

  const parsed = useMemo(() => parseClassifySyncDetails(details), [details])
  const summary = useMemo(() => summarizeClassifyDetails(parsed), [parsed])

  const syncRows = parsed.filter((p): p is Extract<ParsedClassifyLine, { kind: 'sync' }> => p.kind === 'sync')
  const skipRows = parsed.filter((p): p is Extract<ParsedClassifyLine, { kind: 'skip' }> => p.kind === 'skip')
  const infoRows = parsed.filter((p): p is Extract<ParsedClassifyLine, { kind: 'info' }> => p.kind === 'info')
  const rawRows = parsed.filter((p): p is Extract<ParsedClassifyLine, { kind: 'raw' }> => p.kind === 'raw')

  if (parsed.length === 0) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-zinc-200/90 bg-white px-8 py-10 dark:border-zinc-800/90 dark:bg-zinc-950/40',
          'shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
        )}
      >
        <div className="flex items-start gap-4">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600/90 dark:text-emerald-400/90" aria-hidden />
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{t('title')}</h3>
            <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              {t('emptyLog')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-zinc-950/40',
        'shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
      )}
    >
      <div className="border-b border-zinc-100 px-8 py-9 dark:border-zinc-800/80">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/[0.09] dark:bg-emerald-400/[0.12]">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
            </div>
            <div>
              <h3 className="text-[1.375rem] font-semibold tracking-[-0.02em] text-zinc-900 dark:text-zinc-50">
                {t('title')}
              </h3>
              <p className="mt-1 max-w-lg text-[15px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                {t('subtitle')}
              </p>
            </div>
          </div>
          {(summary.totalAdded > 0 || summary.totalRemoved > 0 || summary.syncCount > 0) && (
            <div className="flex gap-10 pl-[3.25rem] sm:pl-0">
              {summary.totalAdded > 0 || summary.syncCount > 0 ? (
                <Stat icon={Plus} value={summary.totalAdded} label={t('statAdded')} />
              ) : null}
              {summary.totalRemoved > 0 ? (
                <Stat icon={Minus} value={summary.totalRemoved} label={t('statRemoved')} />
              ) : null}
            </div>
          )}
        </div>
        {summary.skipCount > 0 ? (
          <p className="mt-6 pl-[3.25rem] text-[13px] leading-relaxed text-zinc-400 dark:text-zinc-500 sm:pl-[4.75rem]">
            {t('skippedSummary', { count: summary.skipCount })}
          </p>
        ) : null}
      </div>

      {syncRows.length > 0 ? (
        <div className="px-2 py-2 sm:px-4">
          <p className="px-4 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
            {t('sectionChanges')}
          </p>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/90">
            {syncRows.map((row, i) => (
              <li key={`${row.segmentKey}-${row.channel}-${i}`} className="px-4 py-5 sm:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <p className="text-[17px] font-medium tracking-[-0.015em] text-zinc-900 dark:text-zinc-50">
                      {segmentLabel(row.segmentKey, tSeg)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">{channelPill(row.channel, tCh)}</div>
                  </div>
                  <div className="flex shrink-0 items-baseline gap-8 sm:gap-10">
                    <div className="text-right">
                      <p className="text-2xl font-semibold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
                        +{row.added}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
                        {t('added')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold tabular-nums tracking-tight text-zinc-800 dark:text-zinc-200">
                        −{row.removed}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
                        {t('removed')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold tabular-nums tracking-tight text-zinc-500 dark:text-zinc-400">
                        {row.target}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
                        {t('inPool')}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {skipRows.length > 0 ? (
        <div className="border-t border-zinc-100 bg-zinc-50/70 px-8 py-6 dark:border-zinc-800/80 dark:bg-zinc-900/25">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
            {t('sectionSkipped')}
          </p>
          <ul className="mt-3 space-y-2.5">
            {skipRows.map((row, i) => {
              let skipMessage: string
              if (row.reason === 'disabled') skipMessage = t('skipDisabled')
              else if (row.platform === 'onlyfans' && row.reason === 'no_list') skipMessage = t('skipNoListOnlyfans')
              else if (row.platform === 'fansly' && row.reason === 'tag_error') skipMessage = t('skipTagFansly')
              else if (row.reason === 'other' && row.detail) skipMessage = t('skipOther', { detail: row.detail })
              else skipMessage = t('skipGeneric', { detail: row.detail ?? '' })
              return (
                <li
                  key={`skip-${row.segmentKey}-${i}`}
                  className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[14px] text-zinc-500 dark:text-zinc-400"
                >
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {segmentLabel(row.segmentKey, tSeg)}
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-500">·</span>
                  <span>{skipMessage}</span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {(infoRows.length > 0 || rawRows.length > 0) && (
        <div className="border-t border-zinc-100 px-8 py-5 dark:border-zinc-800/80">
          {infoRows.map((row, i) => (
            <p
              key={`info-${i}`}
              className="font-mono text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400"
            >
              {row.message}
            </p>
          ))}
          {rawRows.map((row, i) => (
            <p key={`raw-${i}`} className="mt-2 text-[12px] text-zinc-500 dark:text-zinc-500">
              {row.text}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
