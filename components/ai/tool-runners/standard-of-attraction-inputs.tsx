'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { OfFanslyPlatformSelect } from '@/components/ai/of-fansly-platform-select'
import { useAllowedAdultPlatformsForPicker } from '@/hooks/use-allowed-adult-platforms-for-picker'
import { VoiceInputButton } from '@/components/voice-input-button'
import { compressImageForVision } from '@/components/ai/caption-media-utils'

export type StandardOfAttractionRunnerInputsProps = {
  easy: boolean
  attractionImage: string | null
  setAttractionImage: (v: string | null) => void
  niche: string
  setNiche: (v: string) => void
  platform: string
  setPlatform: (v: string) => void
  contentDescription: string
  setContentDescription: (v: string | React.SetStateAction<string>) => void
}

export function StandardOfAttractionRunnerInputs({
  easy,
  attractionImage,
  setAttractionImage,
  niche,
  setNiche,
  platform,
  setPlatform,
  contentDescription,
  setContentDescription,
}: StandardOfAttractionRunnerInputsProps) {
  const t = useTranslations('ai-tools.runners.standard-of-attraction')
  const ts = useTranslations('ai-tools.runners.shared')
  const allowedAdultPlatforms = useAllowedAdultPlatformsForPicker()

  if (easy) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('easyPhotoOrDescribe')}</Label>
          {attractionImage ? (
            <div className="relative overflow-hidden rounded-lg border border-border bg-muted/30">
              <img src={attractionImage} alt={t('uploadAlt')} className="max-h-40 w-full object-contain" />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute right-2 top-2"
                onClick={() => setAttractionImage(null)}
              >
                {ts('remove')}
              </Button>
            </div>
          ) : (
            <Input
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              className="cursor-pointer"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  setAttractionImage(await compressImageForVision(file))
                } catch {
                  const reader = new FileReader()
                  reader.onload = () => setAttractionImage(reader.result as string)
                  reader.readAsDataURL(file)
                }
              }}
            />
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{ts('nicheOptional')}</Label>
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
          <Label>{t('describeShot')}</Label>
          <Textarea
            placeholder={t('shotPlaceholder')}
            value={contentDescription}
            onChange={(e) => setContentDescription(e.target.value)}
            className="min-h-[80px]"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('proYourNicheOptional')}</Label>
          <Input
            placeholder={t('proNichePlaceholder')}
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
      </div>
      <div className="space-y-2">
        <Label>{t('uploadRatingLabel')}</Label>
        {attractionImage ? (
          <div className="relative rounded-lg border border-border bg-muted/30 overflow-hidden">
            <img src={attractionImage} alt={t('uploadedForRatingAlt')} className="max-h-48 w-full object-contain" />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => setAttractionImage(null)}
            >
              {ts('remove')}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              className="cursor-pointer"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const dataUrl = await compressImageForVision(file)
                  setAttractionImage(dataUrl)
                } catch {
                  const reader = new FileReader()
                  reader.onload = () => setAttractionImage(reader.result as string)
                  reader.readAsDataURL(file)
                }
              }}
            />
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t('uploadHint')}</p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t('describeOrLabel')}</Label>
          <VoiceInputButton
            onTranscript={(text) => setContentDescription((prev) => prev + (prev ? ' ' : '') + text)}
            size="sm"
            variant="ghost"
          />
        </div>
        <Textarea
          placeholder={t('describeLongPlaceholder')}
          value={contentDescription}
          onChange={(e) => setContentDescription(e.target.value)}
          className="min-h-[80px]"
        />
      </div>
    </div>
  )
}
