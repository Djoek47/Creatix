/** Staged silence escalation for Divine Realtime voice (web + mobile). */

export const DIVINE_VOICE_SILENCE_MS = {
  /** No server-detected user speech → first check-in */
  first: 47_000,
  /** After first prompt, still no speech → mic message + end */
  afterFirst: 60_000,
  /** If model does not call `end_call` after final prompt */
  endCallFailsafe: 30_000,
} as const

/** Timings mapped from Divine Manager silence patience slider (0–100). Defaults match DIVINE_VOICE_SILENCE_MS at 50. */
export type VoiceSilenceTimingConfig = {
  first: number
  afterFirst: number
  endCallFailsafe: number
}

function piecewise(patience: number, low: number, mid: number, high: number): number {
  const x = Math.max(0, Math.min(100, patience))
  if (x <= 50) return low + (x / 50) * (mid - low)
  return mid + ((x - 50) / 50) * (high - mid)
}

/**
 * Silence ladder: patience 0 = faster check-ins (25s / 40s); 50 = legacy (47s / 60s); 100 = patient (90s / 120s).
 */
export function buildVoiceSilenceConfig(patience0to100: number): VoiceSilenceTimingConfig {
  return {
    first: Math.round(piecewise(patience0to100, 25_000, DIVINE_VOICE_SILENCE_MS.first, 90_000)),
    afterFirst: Math.round(piecewise(patience0to100, 40_000, DIVINE_VOICE_SILENCE_MS.afterFirst, 120_000)),
    endCallFailsafe: DIVINE_VOICE_SILENCE_MS.endCallFailsafe,
  }
}

/** Full staged inactivity window (first + second stage) — use with buildVoiceSilenceConfig for customization. */
export function voiceSilenceProtocolTotalMs(cfg: VoiceSilenceTimingConfig): number {
  return cfg.first + cfg.afterFirst
}

/** 47s + 60s — default protocol total before the final mic/end prompt (patience slider = 50). */
export const DIVINE_VOICE_SILENCE_PROTOCOL_TOTAL_MS =
  DIVINE_VOICE_SILENCE_MS.first + DIVINE_VOICE_SILENCE_MS.afterFirst

/** Crown rainbow hint for the last segment of that window (before final prompt). */
export const DIVINE_VOICE_SILENCE_PROTOCOL_RAINBOW_LAST_MS = 30_000

/** Mic energy fallback threshold (0–255) when no Realtime speech events are received (reduces TV steady noise). */
export const DIVINE_VOICE_SILENCE_MIC_FALLBACK_THRESHOLD = 22

export const DIVINE_VOICE_SILENCE_PROMPT_FIRST =
  '[Inactivity check — the creator has not spoken for a while. Say ONE short, warm sentence asking if they are still there or if anyone can hear you. Do not call any tools.]'

export const DIVINE_VOICE_SILENCE_PROMPT_FINAL =
  '[Inactivity final — there was still no reply after waiting. Briefly say they may have a mic or browser permission issue, suggest checking microphone access and trying voice again later, then call the end_call tool right after you finish that sentence.]'

/** Realtime server events that indicate the user spoke (VAD). Omit injected user text items so briefing prompts do not reset the timer. */
export function isRealtimeUserSpeechEvent(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false
  const p = payload as { type?: string }
  const t = p.type
  if (t === 'input_audio_buffer.speech_started') return true
  if (t === 'input_audio_buffer.speech_stopped') return true
  return false
}
