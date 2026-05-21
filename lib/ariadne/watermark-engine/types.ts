export type GrayFrame = number[][]

export type WatermarkEmbedOptions = {
  seed: number
  strength?: number
  redundancy?: number
  useSpatialLayer?: boolean
}

export type WatermarkDetectOptions = {
  seed: number
  redundancy?: number
  expectedBits?: number
}

export type WatermarkDetectResult = {
  bits: number[]
  confidence: number
  hitRate: number
}

