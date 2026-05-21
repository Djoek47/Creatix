'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { OfFanslyPlatformSelect } from '@/components/ai/of-fansly-platform-select'
import { useAllowedAdultPlatformsForPicker } from '@/hooks/use-allowed-adult-platforms-for-picker'
import { VoiceInputButton } from '@/components/voice-input-button'

export type CompetitorAnalysisRunnerInputsProps = {
  easy: boolean
  niche: string
  setNiche: (v: string) => void
  platform: string
  setPlatform: (v: string) => void
  competitorTargets: string
  setCompetitorTargets: (v: string) => void
  contentDescription: string
  setContentDescription: (v: string | React.SetStateAction<string>) => void
  useCompetitorWebSearch: boolean
  setUseCompetitorWebSearch: (v: boolean) => void
}

export function CompetitorAnalysisRunnerInputs({
  easy,
  niche,
  setNiche,
  platform,
  setPlatform,
  competitorTargets,
  setCompetitorTargets,
  contentDescription,
  setContentDescription,
  useCompetitorWebSearch,
  setUseCompetitorWebSearch,
}: CompetitorAnalysisRunnerInputsProps) {
  const t = useTranslations('ai-tools.runners.competitor-analysis')
  const ts = useTranslations('ai-tools.runners.shared')
  const allowedAdultPlatforms = useAllowedAdultPlatformsForPicker()

  const methodology = t.rich('methodologyLead', {
    cohort: (chunks) => <strong className="text-foreground">{chunks}</strong>,
    named: (chunks) => <strong className="text-foreground">{chunks}</strong>,
    same: (chunks) => <strong className="text-foreground">{chunks}</strong>,
    tier: (chunks) => <strong className="text-foreground">{chunks}</strong>,
  })

  if (easy) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('easyYourNiche')}</Label>
            <Input placeholder={t('easyNichePh')} value={niche} onChange={(e) => setNiche(e.target.value)} />
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
          <Label>{t('compareTo')}</Label>
          <Textarea
            placeholder={t('comparePlaceholder')}
            value={competitorTargets}
            onChange={(e) => setCompetitorTargets(e.target.value)}
            className="min-h-[80px]"
          />
        </div>
        <div className="space-y-2">
          <Label>{t('learnOptional')}</Label>
          <Textarea
            placeholder={t('learnPlaceholder')}
            value={contentDescription}
            onChange={(e) => setContentDescription(e.target.value)}
            className="min-h-[72px]"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">{t('easyProHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">{methodology}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('proYourNiche')}</Label>
          <Input
            placeholder={t('proNichePlaceholder')}
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('primaryPlatform')}</Label>
          <OfFanslyPlatformSelect
            value={platform}
            onValueChange={setPlatform}
            allowedAdultPlatforms={allowedAdultPlatforms}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t('competitorsRequired')}</Label>
        <Textarea
          placeholder={t('competitorsPlaceholder')}
          value={competitorTargets}
          onChange={(e) => setCompetitorTargets(e.target.value)}
          className="min-h-[100px]"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t('comparisonGoal')}</Label>
          <VoiceInputButton
            onTranscript={(text) => setContentDescription((prev) => prev + (prev ? ' ' : '') + text)}
            size="sm"
            variant="ghost"
          />
        </div>
        <Textarea
          placeholder={t('comparisonPlaceholder')}
          value={contentDescription}
          onChange={(e) => setContentDescription(e.target.value)}
          className="min-h-[100px]"
        />
      </div>
      <div className="flex items-start gap-2">
        <Checkbox
          id="competitor-web"
          checked={useCompetitorWebSearch}
          onCheckedChange={(v) => setUseCompetitorWebSearch(v === true)}
        />
        <label htmlFor="competitor-web" className="text-xs leading-snug text-muted-foreground cursor-pointer">
          {t('webSearchCheckbox')}
        </label>
      </div>
    </div>
  )
}
