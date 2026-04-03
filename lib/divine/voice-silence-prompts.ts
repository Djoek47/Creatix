/** Staged silence escalation for Divine Realtime voice (web + mobile). */

export const DIVINE_VOICE_SILENCE_MS = {
  /** No server-detected user speech → first check-in */
  first: 47_000,
  /** After first prompt, still no speech → mic message + end */
  afterFirst: 60_000,
  /** If model does not call `end_call` after final prompt */
  endCallFailsafe: 30_000,
} as const

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
