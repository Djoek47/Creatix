'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { OfFanslyPlatformSelect } from '@/components/ai/of-fansly-platform-select'
import { useAllowedAdultPlatformsForPicker } from '@/hooks/use-allowed-adult-platforms-for-picker'

export type ContentIdeasRunnerInputsProps = {
  easy: boolean
  niche: string
  setNiche: (v: string) => void
  platform: string
  setPlatform: (v: string) => void
  contentDescription: string
  setContentDescription: (v: string | React.SetStateAction<string>) => void
}

export function ContentIdeasRunnerInputs({
  easy,
  niche,
  setNiche,
  platform,
  setPlatform,
  contentDescription,
  setContentDescription,
}: ContentIdeasRunnerInputsProps) {
  const t = useTranslations('ai-tools.runners.content-ideas')
  const ts = useTranslations('ai-tools.runners.shared')
  const allowedAdultPlatforms = useAllowedAdultPlatformsForPicker()

  if (easy) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('easyNicheLabel')}</Label>
          <Input
            placeholder={t('easyNichePlaceholder')}
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{ts('platform')}</Label>
          <OfFanslyPlatformSelect
            value={platform}
            onValueChange={setPlatform}
            allowedAdultPlatforms={allowedAdultPlatforms}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('easyTrendingLabel')}</Label>
          <Textarea
            placeholder={t('easyTrendingPlaceholder')}
            value={contentDescription}
            onChange={(e) => setContentDescription(e.target.value)}
            className="min-h-[72px]"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('proYourNiche')}</Label>
          <Input placeholder={t('proNichePlaceholder')} value={niche} onChange={(e) => setNiche(e.target.value)} />
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
        <Label>{t('proTrendsLabel')}</Label>
        <Textarea
          placeholder={t('proTrendsPlaceholder')}
          value={contentDescription}
          onChange={(e) => setContentDescription(e.target.value)}
          className="min-h-[80px]"
        />
      </div>
    </div>
  )
}
