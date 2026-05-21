'use client'

import { useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { VoiceInputButton } from '@/components/voice-input-button'

export type DefaultToolRunnerInputsProps = {
  easy: boolean
  contentDescription: string
  setContentDescription: (v: string | React.SetStateAction<string>) => void
}

export function DefaultToolRunnerInputs({ easy, contentDescription, setContentDescription }: DefaultToolRunnerInputsProps) {
  const t = useTranslations('ai-tools.runners.shared')
  if (easy) {
    return (
      <div className="space-y-2">
        <Label>{t('whatDoYouNeed')}</Label>
        <Textarea
          placeholder={t('describePlain')}
          value={contentDescription}
          onChange={(e) => setContentDescription(e.target.value)}
          className="min-h-[100px]"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t('input')}</Label>
          <VoiceInputButton
            onTranscript={(text) => setContentDescription((prev) => prev + (prev ? ' ' : '') + text)}
            size="sm"
            variant="ghost"
          />
        </div>
        <Textarea
          placeholder={t('enterRequest')}
          value={contentDescription}
          onChange={(e) => setContentDescription(e.target.value)}
          className="min-h-[100px]"
        />
      </div>
    </div>
  )
}
