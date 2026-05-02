'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { VoiceInputButton } from '@/components/voice-input-button'

export type GiftSuggesterRunnerInputsProps = {
  easy: boolean
  fanMessage: string
  setFanMessage: (v: string | React.SetStateAction<string>) => void
  currentPrice: string
  setCurrentPrice: (v: string) => void
  giftUseWishlist: boolean
  setGiftUseWishlist: (v: boolean) => void
}

export function GiftSuggesterRunnerInputs({
  easy,
  fanMessage,
  setFanMessage,
  currentPrice,
  setCurrentPrice,
  giftUseWishlist,
  setGiftUseWishlist,
}: GiftSuggesterRunnerInputsProps) {
  const t = useTranslations('ai-tools.runners.gift-suggester')

  if (easy) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('easyWhoFan')}</Label>
          <Textarea
            placeholder={t('easyFanPlaceholder')}
            value={fanMessage}
            onChange={(e) => setFanMessage(e.target.value)}
            className="min-h-[88px]"
          />
        </div>
        <div className="space-y-2">
          <Label>{t('easyBudgetOptional')}</Label>
          <Input placeholder={t('easyBudgetPlaceholder')} value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} />
        </div>
        <p className="text-[11px] text-muted-foreground">{t('easyProHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t('fanContext')}</Label>
          <VoiceInputButton
            onTranscript={(text) => setFanMessage((prev) => prev + (prev ? ' ' : '') + text)}
            size="sm"
            variant="ghost"
          />
        </div>
        <Textarea
          placeholder={t('proFanPlaceholder')}
          value={fanMessage}
          onChange={(e) => setFanMessage(e.target.value)}
          className="min-h-[100px]"
        />
      </div>
      <div className="space-y-2">
        <Label>{t('budgetTierHint')}</Label>
        <Input
          placeholder={t('proBudgetPlaceholder')}
          value={currentPrice}
          onChange={(e) => setCurrentPrice(e.target.value)}
        />
      </div>
      <div className="flex items-center space-x-2 rounded-md border border-border p-3">
        <Checkbox id="gift-wl" checked={giftUseWishlist} onCheckedChange={(c) => setGiftUseWishlist(c === true)} />
        <label htmlFor="gift-wl" className="text-sm cursor-pointer">
          {t('useWishlist')}{' '}
          <Link href="/dashboard/ai-studio/gifts" className="text-primary underline">
            {t('manageList')}
          </Link>
        </label>
      </div>
    </div>
  )
}
