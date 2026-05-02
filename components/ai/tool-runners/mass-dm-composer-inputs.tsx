'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type MassDmComposerRunnerInputsProps = {
  easy: boolean
  campaignGoal: string
  setCampaignGoal: (v: string) => void
  contentType: string
  setContentType: (v: string) => void
  contentDescription: string
  setContentDescription: (v: string | React.SetStateAction<string>) => void
  audienceSegment: string
  setAudienceSegment: (v: string) => void
}

export function MassDmComposerRunnerInputs({
  easy,
  campaignGoal,
  setCampaignGoal,
  contentType,
  setContentType,
  contentDescription,
  setContentDescription,
  audienceSegment,
  setAudienceSegment,
}: MassDmComposerRunnerInputsProps) {
  const t = useTranslations('ai-tools.runners.mass-dm-composer')
  const ts = useTranslations('ai-tools.runners.shared')

  if (easy) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('blastFor')}</Label>
          <Input
            placeholder={t('blastPlaceholder')}
            value={campaignGoal}
            onChange={(e) => setCampaignGoal(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{ts('tone')}</Label>
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="friendly">{t('toneFriendly')}</SelectItem>
              <SelectItem value="flirty">{t('toneFlirty')}</SelectItem>
              <SelectItem value="urgent">{t('toneUrgent')}</SelectItem>
              <SelectItem value="exclusive">{t('toneExclusive')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('afterReadingOptional')}</Label>
          <Textarea
            placeholder={t('afterReadingPlaceholder')}
            value={contentDescription}
            onChange={(e) => setContentDescription(e.target.value)}
            className="min-h-[72px]"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">{t('proAudienceHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('audienceSegment')}</Label>
          <Select value={audienceSegment} onValueChange={setAudienceSegment}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('segAll')}</SelectItem>
              <SelectItem value="new">{t('segNew')}</SelectItem>
              <SelectItem value="inactive">{t('segInactive')}</SelectItem>
              <SelectItem value="whales">{t('segWhales')}</SelectItem>
              <SelectItem value="expiring">{t('segExpiring')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{ts('tone')}</Label>
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="friendly">{t('toneFriendly')}</SelectItem>
              <SelectItem value="flirty">{t('toneFlirty')}</SelectItem>
              <SelectItem value="urgent">{t('toneUrgentPro')}</SelectItem>
              <SelectItem value="exclusive">{t('toneExclusivePro')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t('campaignGoal')}</Label>
        <Input
          placeholder={t('campaignGoalPlaceholder')}
          value={campaignGoal}
          onChange={(e) => setCampaignGoal(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>{t('callToAction')}</Label>
        <Textarea
          placeholder={t('ctaPlaceholder')}
          value={contentDescription}
          onChange={(e) => setContentDescription(e.target.value)}
          className="min-h-[60px]"
        />
      </div>
    </div>
  )
}
