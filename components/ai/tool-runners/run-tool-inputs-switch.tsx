'use client'

import type { MutableRefObject, ReactNode } from 'react'
import type { VoiceSessionContextValue } from '@/components/divine/voice-session-context'
import type { UpcomingCosmicEvent } from '@/lib/calendar/upcoming-cosmic-events'
import type { ChurnFanPickerRow } from '@/lib/crm/fetch-crm-fans-client'
import type { CrmFansResponse } from '@/lib/crm/crm-fan-types'
import { CaptionGeneratorRunnerInputs } from '@/components/ai/tool-runners/caption-generator-inputs'
import { ContentIdeasRunnerInputs } from '@/components/ai/tool-runners/content-ideas-inputs'
import {
  FantasyWriterRunnerInputs,
  type FantasyFanPickerRow,
  type FantasyScheduledRow,
} from '@/components/ai/tool-runners/fantasy-writer-inputs'
import { PhotoEnhancerRunnerInputs } from '@/components/ai/tool-runners/photo-enhancer-inputs'
import { GiftSuggesterRunnerInputs } from '@/components/ai/tool-runners/gift-suggester-inputs'
import { ChurnPredictorRunnerInputs } from '@/components/ai/tool-runners/churn-predictor-inputs'
import { IncomePredictorRunnerInputs } from '@/components/ai/tool-runners/income-predictor-inputs'
import { MassDmComposerRunnerInputs } from '@/components/ai/tool-runners/mass-dm-composer-inputs'
import { StandardOfAttractionRunnerInputs } from '@/components/ai/tool-runners/standard-of-attraction-inputs'
import { CompetitorAnalysisRunnerInputs } from '@/components/ai/tool-runners/competitor-analysis-inputs'
import { VenusCupidRunnerInputs } from '@/components/ai/tool-runners/venus-cupid-inputs'
import {
  PricingOptimizerInputsEasy,
  PricingOptimizerInputsPro,
} from '@/components/ai/tool-runners/pricing-optimizer-fields'
import { DefaultToolRunnerInputs } from '@/components/ai/tool-runners/default-tool-inputs'

export type RunToolInputsSwitchProps = {
  effectiveRunnerId: string
  runnerMode: 'easy' | 'pro'
  platform: string
  setPlatform: (v: string) => void
  contentType: string
  setContentType: (v: string) => void
  captionImageDataUrl: string | null
  setCaptionImageDataUrl: (v: string | null) => void
  contentDescription: string
  setContentDescription: (v: string | React.SetStateAction<string>) => void
  niche: string
  setNiche: (v: string) => void
  fanMessage: string
  setFanMessage: (v: string | React.SetStateAction<string>) => void
  currentPrice: string
  setCurrentPrice: (v: string) => void
  photoEditImageDataUrl: string | null
  setPhotoEditImageDataUrl: (v: string | null) => void
  voiceSession: VoiceSessionContextValue | null
  photoVoiceImageRef: MutableRefObject<string | null>
  giftUseWishlist: boolean
  setGiftUseWishlist: (v: boolean) => void
  churnFanId: string
  setChurnFanId: (v: string) => void
  churnFans: ChurnFanPickerRow[]
  churnFansFiltered: ChurnFanPickerRow[]
  churnExpiringOnly: boolean
  setChurnExpiringOnly: (v: boolean) => void
  incomePredictorMode: 'maintain' | 'grow'
  setIncomePredictorMode: (v: 'maintain' | 'grow') => void
  incomePredictorGoal: string
  setIncomePredictorGoal: (v: string) => void
  incomeCalendarMode: 'week' | 'month'
  setIncomeCalendarMode: (v: 'week' | 'month') => void
  campaignGoal: string
  setCampaignGoal: (v: string) => void
  audienceSegment: string
  setAudienceSegment: (v: string) => void
  attractionImage: string | null
  setAttractionImage: (v: string | null) => void
  competitorTargets: string
  setCompetitorTargets: (v: string) => void
  useCompetitorWebSearch: boolean
  setUseCompetitorWebSearch: (v: boolean) => void
  cupidTagChurn: boolean
  setCupidTagChurn: (v: boolean) => void
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

export function runToolInputsSwitch(p: RunToolInputsSwitchProps): ReactNode {
  const easy = p.runnerMode === 'easy'

  switch (p.effectiveRunnerId) {
    case 'caption-generator':
      return (
        <CaptionGeneratorRunnerInputs
          easy={easy}
          platform={p.platform}
          setPlatform={p.setPlatform}
          contentType={p.contentType}
          setContentType={p.setContentType}
          captionImageDataUrl={p.captionImageDataUrl}
          setCaptionImageDataUrl={p.setCaptionImageDataUrl}
          contentDescription={p.contentDescription}
          setContentDescription={p.setContentDescription}
        />
      )
    case 'content-ideas':
      return (
        <ContentIdeasRunnerInputs
          easy={easy}
          niche={p.niche}
          setNiche={p.setNiche}
          platform={p.platform}
          setPlatform={p.setPlatform}
          contentDescription={p.contentDescription}
          setContentDescription={p.setContentDescription}
        />
      )
    case 'fantasy-writer':
      return (
        <FantasyWriterRunnerInputs
          easy={easy}
          contentType={p.contentType}
          setContentType={p.setContentType}
          platform={p.platform}
          setPlatform={p.setPlatform}
          contentDescription={p.contentDescription}
          setContentDescription={p.setContentDescription}
          upcomingCosmicEvents={p.upcomingCosmicEvents}
          fantasyHolidayEventId={p.fantasyHolidayEventId}
          setFantasyHolidayEventId={p.setFantasyHolidayEventId}
          fantasyContentId={p.fantasyContentId}
          setFantasyContentId={p.setFantasyContentId}
          fantasyFanId={p.fantasyFanId}
          setFantasyFanId={p.setFantasyFanId}
          fantasyFans={p.fantasyFans}
          fantasyScheduledContent={p.fantasyScheduledContent}
          crmFansMeta={p.crmFansMeta}
        />
      )
    case 'photo-enhancer':
      return (
        <PhotoEnhancerRunnerInputs
          easy={easy}
          photoEditImageDataUrl={p.photoEditImageDataUrl}
          setPhotoEditImageDataUrl={p.setPhotoEditImageDataUrl}
          contentDescription={p.contentDescription}
          setContentDescription={p.setContentDescription}
          voiceSession={p.voiceSession}
          photoVoiceImageRef={p.photoVoiceImageRef}
        />
      )
    case 'gift-suggester':
      return (
        <GiftSuggesterRunnerInputs
          easy={easy}
          fanMessage={p.fanMessage}
          setFanMessage={p.setFanMessage}
          currentPrice={p.currentPrice}
          setCurrentPrice={p.setCurrentPrice}
          giftUseWishlist={p.giftUseWishlist}
          setGiftUseWishlist={p.setGiftUseWishlist}
        />
      )
    case 'churn-predictor':
      return (
        <ChurnPredictorRunnerInputs
          easy={easy}
          churnFanId={p.churnFanId}
          setChurnFanId={p.setChurnFanId}
          churnFans={p.churnFans}
          churnFansFiltered={p.churnFansFiltered}
          churnExpiringOnly={p.churnExpiringOnly}
          setChurnExpiringOnly={p.setChurnExpiringOnly}
          fanMessage={p.fanMessage}
          setFanMessage={p.setFanMessage}
          contentDescription={p.contentDescription}
          setContentDescription={p.setContentDescription}
          crmFansMeta={p.crmFansMeta}
        />
      )
    case 'income-predictor':
      return (
        <IncomePredictorRunnerInputs
          easy={easy}
          incomePredictorMode={p.incomePredictorMode}
          setIncomePredictorMode={p.setIncomePredictorMode}
          incomePredictorGoal={p.incomePredictorGoal}
          setIncomePredictorGoal={p.setIncomePredictorGoal}
          incomeCalendarMode={p.incomeCalendarMode}
          setIncomeCalendarMode={p.setIncomeCalendarMode}
        />
      )
    case 'mass-dm-composer':
      return (
        <MassDmComposerRunnerInputs
          easy={easy}
          campaignGoal={p.campaignGoal}
          setCampaignGoal={p.setCampaignGoal}
          contentType={p.contentType}
          setContentType={p.setContentType}
          contentDescription={p.contentDescription}
          setContentDescription={p.setContentDescription}
          audienceSegment={p.audienceSegment}
          setAudienceSegment={p.setAudienceSegment}
        />
      )
    case 'standard-of-attraction':
      return (
        <StandardOfAttractionRunnerInputs
          easy={easy}
          attractionImage={p.attractionImage}
          setAttractionImage={p.setAttractionImage}
          niche={p.niche}
          setNiche={p.setNiche}
          platform={p.platform}
          setPlatform={p.setPlatform}
          contentDescription={p.contentDescription}
          setContentDescription={p.setContentDescription}
        />
      )
    case 'competitor-analysis':
      return (
        <CompetitorAnalysisRunnerInputs
          easy={easy}
          niche={p.niche}
          setNiche={p.setNiche}
          platform={p.platform}
          setPlatform={p.setPlatform}
          competitorTargets={p.competitorTargets}
          setCompetitorTargets={p.setCompetitorTargets}
          contentDescription={p.contentDescription}
          setContentDescription={p.setContentDescription}
          useCompetitorWebSearch={p.useCompetitorWebSearch}
          setUseCompetitorWebSearch={p.setUseCompetitorWebSearch}
        />
      )
    case 'venus-cupid':
      return (
        <VenusCupidRunnerInputs easy={easy} cupidTagChurn={p.cupidTagChurn} setCupidTagChurn={p.setCupidTagChurn} />
      )
    case 'pricing-optimizer':
      if (easy) {
        return (
          <PricingOptimizerInputsEasy
            contentType={p.contentType}
            setContentType={p.setContentType}
            currentPrice={p.currentPrice}
            setCurrentPrice={p.setCurrentPrice}
            niche={p.niche}
            setNiche={p.setNiche}
            fanMessage={p.fanMessage}
            setFanMessage={p.setFanMessage}
          />
        )
      }
      return (
        <PricingOptimizerInputsPro
          contentType={p.contentType}
          setContentType={p.setContentType}
          currentPrice={p.currentPrice}
          setCurrentPrice={p.setCurrentPrice}
          niche={p.niche}
          setNiche={p.setNiche}
          fanMessage={p.fanMessage}
          setFanMessage={p.setFanMessage}
        />
      )
    default:
      return (
        <DefaultToolRunnerInputs
          easy={easy}
          contentDescription={p.contentDescription}
          setContentDescription={p.setContentDescription}
        />
      )
  }
}
