'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Props = {
  contentType: string
  setContentType: (v: string) => void
  currentPrice: string
  setCurrentPrice: (v: string) => void
  niche: string
  setNiche: (v: string) => void
  fanMessage: string
  setFanMessage: (v: string) => void
}

export function PricingOptimizerInputsEasy({
  contentType,
  setContentType,
  currentPrice,
  setCurrentPrice,
  niche,
  setNiche,
}: Props) {
  const t = useTranslations('ai-tools.runners.pricing-optimizer')

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('whatPricing')}</Label>
        <Select value={contentType} onValueChange={setContentType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="photo">{t('typePhotoSets')}</SelectItem>
            <SelectItem value="video">{t('typeVideos')}</SelectItem>
            <SelectItem value="ppv">{t('typePpv')}</SelectItem>
            <SelectItem value="subscription">{t('typeSubscription')}</SelectItem>
            <SelectItem value="custom">{t('typeCustom')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t('currentPriceIfAny')}</Label>
        <Input placeholder={t('currentPricePlaceholder')} value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>{t('nicheLabel')}</Label>
        <Input placeholder={t('nichePlaceholderEasy')} value={niche} onChange={(e) => setNiche(e.target.value)} />
      </div>
    </div>
  )
}

export function PricingOptimizerInputsPro({
  contentType,
  setContentType,
  currentPrice,
  setCurrentPrice,
  niche,
  setNiche,
  fanMessage,
  setFanMessage,
}: Props) {
  const t = useTranslations('ai-tools.runners.pricing-optimizer')

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('contentTypePro')}</Label>
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="photo">{t('typePhotoSets')}</SelectItem>
              <SelectItem value="video">{t('typeVideos')}</SelectItem>
              <SelectItem value="ppv">{t('typePpv')}</SelectItem>
              <SelectItem value="subscription">{t('typeSubscription')}</SelectItem>
              <SelectItem value="custom">{t('typeCustom')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('currentPricePro')}</Label>
          <Input
            placeholder={t('currentPricePlaceholderPro')}
            value={currentPrice}
            onChange={(e) => setCurrentPrice(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('nicheLabel')}</Label>
          <Input placeholder={t('nichePlaceholderPro')} value={niche} onChange={(e) => setNiche(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t('subscriberHint')}</Label>
          <Input
            placeholder={t('subscriberPlaceholder')}
            value={fanMessage}
            onChange={(e) => setFanMessage(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
