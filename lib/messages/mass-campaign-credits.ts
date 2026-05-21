import { getCreditsForToolId, CREDITS_MESSAGE_SEND_PLATFORM } from '@/lib/billing/credit-economics'

export type MassCampaignCreditInput = {
  recipientCount: number
  includeAudienceSuggestionRun?: boolean
  includeCaptionGenerationRun?: boolean
  includePriceGenerationRun?: boolean
  personalizedSend?: boolean
}

export type MassCampaignCreditBreakdown = {
  audienceSuggestion: number
  captionGeneration: number
  priceGeneration: number
  send: number
  total: number
}

function clampCount(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value ?? 0))
}

export function estimateMassCampaignCredits(input: MassCampaignCreditInput): MassCampaignCreditBreakdown {
  const recipients = clampCount(input.recipientCount)

  const audienceSuggestion = input.includeAudienceSuggestionRun
    ? getCreditsForToolId('mass-dm-audience-suggester')
    : 0
  const captionGeneration = input.includeCaptionGenerationRun
    ? getCreditsForToolId('mass-dm-fan-captions')
    : 0
  const priceGeneration = input.includePriceGenerationRun
    ? getCreditsForToolId('mass-dm-ppv-pricing')
    : 0

  const send = input.personalizedSend ? recipients * CREDITS_MESSAGE_SEND_PLATFORM : 0

  return {
    audienceSuggestion,
    captionGeneration,
    priceGeneration,
    send,
    total: audienceSuggestion + captionGeneration + priceGeneration + send,
  }
}
