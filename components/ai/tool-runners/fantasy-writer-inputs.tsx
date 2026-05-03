'use client'

import { useTranslations } from 'next-intl'
import { Calendar, Users } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OfFanslyPlatformSelect } from '@/components/ai/of-fansly-platform-select'
import { useAllowedAdultPlatformsForPicker } from '@/hooks/use-allowed-adult-platforms-for-picker'
import { VoiceInputButton } from '@/components/voice-input-button'
import type { UpcomingCosmicEvent } from '@/lib/calendar/upcoming-cosmic-events'
import { formatFantasyRunnerDate } from '@/lib/calendar/format-fantasy-runner-date'
import type { CrmFansResponse } from '@/lib/crm/crm-fan-types'

export type FantasyFanPickerRow = {
  id: string
  username: string | null
  platform_username: string | null
  display_name: string | null
  total_spent: number | null
  platform: string
  notes: string | null
  tags: unknown
}

export type FantasyScheduledRow = {
  id: string
  title: string
  description: string | null
  scheduled_at: string | null
  status: string
}

export type FantasyWriterRunnerInputsProps = {
  easy: boolean
  contentType: string
  setContentType: (v: string) => void
  platform: string
  setPlatform: (v: string) => void
  contentDescription: string
  setContentDescription: (v: string | React.SetStateAction<string>) => void
  upcomingCosmicEvents: UpcomingCosmicEvent[]
  fantasyHolidayEventId: string
  setFantasyHolidayEventId: (v: string) => void
  fantasyContentId: string
  setFantasyContentId: (v: string) => void
  fantasyFanId: string
  setFantasyFanId: (v: string) => void
  fantasyFans: FantasyFanPickerRow[]
  fantasyScheduledContent: FantasyScheduledRow[]
  crmFansMeta: CrmFansResponse['meta'] | null
}

export function FantasyWriterRunnerInputs({
  easy,
  contentType,
  setContentType,
  platform,
  setPlatform,
  contentDescription,
  setContentDescription,
  upcomingCosmicEvents,
  fantasyHolidayEventId,
  setFantasyHolidayEventId,
  fantasyContentId,
  setFantasyContentId,
  fantasyFanId,
  setFantasyFanId,
  fantasyFans,
  fantasyScheduledContent,
  crmFansMeta,
}: FantasyWriterRunnerInputsProps) {
  const t = useTranslations('ai-tools.runners.fantasy-writer')
  const ts = useTranslations('ai-tools.runners.shared')
  const allowedAdultPlatforms = useAllowedAdultPlatformsForPicker()

  if (easy) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('easyToneLabel')}</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="romantic">{t('toneRomantic')}</SelectItem>
                <SelectItem value="playful">{t('tonePlayful')}</SelectItem>
                <SelectItem value="mysterious">{t('toneMysterious')}</SelectItem>
                <SelectItem value="dominant">{t('toneDominant')}</SelectItem>
                <SelectItem value="submissive">{t('toneSubmissive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{ts('platform')}</Label>
            <OfFanslyPlatformSelect
              value={platform}
              onValueChange={setPlatform}
              allowedAdultPlatforms={allowedAdultPlatforms}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t('easySceneLabel')}</Label>
          <Textarea
            placeholder={t('easyScenePlaceholder')}
            value={contentDescription}
            onChange={(e) => setContentDescription(e.target.value)}
            className="min-h-[100px]"
          />
          <p className="text-[11px] text-muted-foreground">{t('easyProHint')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('proToneStyleLabel')}</Label>
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="romantic">{t('toneRomantic')}</SelectItem>
              <SelectItem value="playful">{t('tonePlayful')}</SelectItem>
              <SelectItem value="mysterious">{t('toneMysterious')}</SelectItem>
              <SelectItem value="dominant">{t('toneDominant')}</SelectItem>
              <SelectItem value="submissive">{t('toneSubmissive')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{ts('platform')}</Label>
          <OfFanslyPlatformSelect
            value={platform}
            onValueChange={setPlatform}
            allowedAdultPlatforms={allowedAdultPlatforms}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {t('cosmicCalendarLabel')}
        </Label>
        <Select
          value={fantasyHolidayEventId || 'none'}
          onValueChange={(v) => setFantasyHolidayEventId(v === 'none' ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('cosmicCalendarPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{ts('none')}</SelectItem>
            {upcomingCosmicEvents.map((ev) => (
              <SelectItem key={ev.id} value={ev.id}>
                {formatFantasyRunnerDate(ev.date)} — {ev.holiday.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t('scheduledContentLabel')}</Label>
        <Select value={fantasyContentId || 'none'} onValueChange={(v) => setFantasyContentId(v === 'none' ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder={t('scheduledContentPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{ts('none')}</SelectItem>
            {fantasyScheduledContent.map((row) => (
              <SelectItem key={row.id} value={row.id}>
                {row.title}
                {row.scheduled_at ? ` · ${formatFantasyRunnerDate(new Date(row.scheduled_at))}` : ''} ({row.status})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fantasyScheduledContent.length === 0 && (
          <p className="text-xs text-muted-foreground">{t('noCalendarItems')}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          {t('fanProfileLabel')}
        </Label>
        <Select value={fantasyFanId || 'none'} onValueChange={(v) => setFantasyFanId(v === 'none' ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder={t('fanProfilePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{ts('none')}</SelectItem>
            {fantasyFans.map((f) => {
              const handle = f.username || f.platform_username || ts('fanFallback')
              return (
                <SelectItem key={f.id} value={f.id}>
                  @{handle} · {f.platform}
                  {f.total_spent != null ? ` · ~$${f.total_spent}` : ''}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        {crmFansMeta?.warnings?.length ? (
          <p className="text-xs text-amber-600 dark:text-amber-500">{crmFansMeta.warnings.join(' ')}</p>
        ) : null}
        {fantasyFans.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {crmFansMeta == null
              ? t('fansLoadError')
              : crmFansMeta.onlyFansConnected || crmFansMeta.fanslyConnected
                ? t('fansSyncHint')
                : t('fansConnectHint')}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t('scenarioLabel')}</Label>
          <VoiceInputButton
            onTranscript={(text) => setContentDescription((prev) => prev + (prev ? ' ' : '') + text)}
            size="sm"
            variant="ghost"
          />
        </div>
        <Textarea
          placeholder={t('scenarioPlaceholder')}
          value={contentDescription}
          onChange={(e) => setContentDescription(e.target.value)}
          className="min-h-[100px]"
        />
      </div>
    </div>
  )
}
