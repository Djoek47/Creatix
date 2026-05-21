export const DEFAULT_OPENAI_REALTIME_MODEL = 'gpt-realtime-2'

/**
 * Central OpenAI Realtime model for WebRTC voice routes.
 * OPENAI_REALTIME_MODEL is intentionally narrow: it supports quick rollback or
 * snapshot pinning without changing route code.
 */
export function getOpenAIRealtimeModel(): string {
  const model = process.env.OPENAI_REALTIME_MODEL?.trim()
  return model || DEFAULT_OPENAI_REALTIME_MODEL
}
