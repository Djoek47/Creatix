'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
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
import { OfFanslyPlatformSelect } from '@/components/ai/of-fansly-platform-select'
import { useAllowedAdultPlatformsForPicker } from '@/hooks/use-allowed-adult-platforms-for-picker'
import { VoiceInputButton } from '@/components/voice-input-button'
import {
  compressImageForVision,
  extractVideoFrameAsDataUrl,
} from '@/components/ai/caption-media-utils'

export type CaptionGeneratorRunnerInputsProps = {
  easy: boolean
  platform: string
  setPlatform: (v: string) => void
  contentType: string
  setContentType: (v: string) => void
  captionImageDataUrl: string | null
  setCaptionImageDataUrl: (v: string | null) => void
  contentDescription: string
  setContentDescription: (v: string | React.SetStateAction<string>) => void
}

export function CaptionGeneratorRunnerInputs({
  easy,
  platform,
  setPlatform,
  contentType,
  setContentType,
  captionImageDataUrl,
  setCaptionImageDataUrl,
  contentDescription,
  setContentDescription,
}: CaptionGeneratorRunnerInputsProps) {
  const t = useTranslations('ai-tools.runners.caption-generator')
  const ts = useTranslations('ai-tools.runners.shared')
  const allowedAdultPlatforms = useAllowedAdultPlatformsForPicker()

  if (easy) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{ts('platform')}</Label>
          <OfFanslyPlatformSelect
            value={platform}
            onValueChange={setPlatform}
            allowedAdultPlatforms={allowedAdultPlatforms}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('easyUploadLabel')}</Label>
          {captionImageDataUrl ? (
            <div className="relative overflow-hidden rounded-lg border border-border bg-muted/30">
              <img
                src={captionImageDataUrl}
                alt={t('previewAlt')}
                className="max-h-40 w-full object-contain"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute right-2 top-2"
                onClick={() => setCaptionImageDataUrl(null)}
              >
                {ts('remove')}
              </Button>
            </div>
          ) : (
            <Input
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp,video/mp4,video/quicktime,video/webm"
              className="cursor-pointer"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                try {
                  if (file.type.startsWith('video/')) {
                    const frame = await extractVideoFrameAsDataUrl(file)
                    const blob = await fetch(frame).then((r) => r.blob())
                    const compressed = await compressImageForVision(
                      new File([blob], 'frame.jpg', { type: 'image/jpeg' }),
                    )
                    setCaptionImageDataUrl(compressed)
                  } else {
                    const dataUrl = await compressImageForVision(file)
                    setCaptionImageDataUrl(dataUrl)
                  }
                } catch {
                  const reader = new FileReader()
                  reader.onload = () => setCaptionImageDataUrl(reader.result as string)
                  reader.readAsDataURL(file)
                }
              }}
            />
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t('easyPostLabel')}</Label>
            <VoiceInputButton
              onTranscript={(text) => setContentDescription((prev) => prev + (prev ? ' ' : '') + text)}
              size="sm"
              variant="ghost"
              showTooltip={true}
            />
          </div>
          <Textarea
            placeholder={t('easyPostPlaceholder')}
            value={contentDescription}
            onChange={(e) => setContentDescription(e.target.value)}
            className="min-h-[88px]"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{ts('contentType')}</Label>
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="photo">{t('typePhoto')}</SelectItem>
              <SelectItem value="video">{t('typeVideo')}</SelectItem>
              <SelectItem value="photoset">{t('typePhotoset')}</SelectItem>
              <SelectItem value="story">{t('typeStory')}</SelectItem>
              <SelectItem value="livestream">{t('typeLivestream')}</SelectItem>
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
        <Label>{t('uploadMediaLabel')}</Label>
        {captionImageDataUrl ? (
          <div className="relative overflow-hidden rounded-lg border border-border bg-muted/30">
            <img
              src={captionImageDataUrl}
              alt={t('previewAlt')}
              className="max-h-48 w-full object-contain"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="absolute right-2 top-2"
              onClick={() => setCaptionImageDataUrl(null)}
            >
              {ts('remove')}
            </Button>
          </div>
        ) : (
          <Input
            type="file"
            accept="image/jpeg,image/png,image/jpg,image/webp,video/mp4,video/quicktime,video/webm"
            className="cursor-pointer"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                if (file.type.startsWith('video/')) {
                  const frame = await extractVideoFrameAsDataUrl(file)
                  const blob = await fetch(frame).then((r) => r.blob())
                  const compressed = await compressImageForVision(
                    new File([blob], 'frame.jpg', { type: 'image/jpeg' }),
                  )
                  setCaptionImageDataUrl(compressed)
                } else {
                  const dataUrl = await compressImageForVision(file)
                  setCaptionImageDataUrl(dataUrl)
                }
              } catch {
                const reader = new FileReader()
                reader.onload = () => setCaptionImageDataUrl(reader.result as string)
                reader.readAsDataURL(file)
              }
            }}
          />
        )}
        <p className="text-xs text-muted-foreground">{t('videoHint')}</p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t('describeLabel')}</Label>
          <VoiceInputButton
            onTranscript={(text) => setContentDescription((prev) => prev + (prev ? ' ' : '') + text)}
            size="sm"
            variant="ghost"
            showTooltip={true}
          />
        </div>
        <Textarea
          placeholder={t('describePlaceholder')}
          value={contentDescription}
          onChange={(e) => setContentDescription(e.target.value)}
          className="min-h-[100px]"
        />
      </div>
    </div>
  )
}
