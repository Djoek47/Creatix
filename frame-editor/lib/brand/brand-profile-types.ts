export type BrandWatermarkPlacement = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'

export type BrandWatermarkDefaults = {
  placement: BrandWatermarkPlacement
  opacityPct: number
  scalePct: number
  traceRecipientPrefix?: string | null
}

