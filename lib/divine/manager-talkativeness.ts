export type ManagerTalkativeness = 'low' | 'balanced' | 'high'

export function normalizeManagerTalkativeness(raw: unknown): ManagerTalkativeness {
  if (raw === 'low' || raw === 'high') return raw
  return 'balanced'
}

/** Realtime voice session: injected into model instructions. */
export function managerTalkativenessRealtimeBlock(level: ManagerTalkativeness): string {
  if (level === 'low') {
    return `\n\nResponse length (creator preference: brief): Keep spoken answers short and direct—often one or two sentences. Summarize lists instead of reading many items aloud. Skip filler and long warm-ups; stay useful and complete.`
  }
  if (level === 'high') {
    return `\n\nResponse length (creator preference: more expressive): Be warm and conversational. When helpful, add a short line of context, encouragement, or why you recommend something—without turning into a long monologue. Still let the creator talk; prioritize clarity.`
  }
  return `\n\nResponse length (creator preference: balanced): Default to concise manager voice; add a sentence of context when it genuinely helps them decide.`
}

/** Text chat system prompt: appended after base chat-behavior rules. */
export function managerTalkativenessChatSuffix(level: ManagerTalkativeness): string {
  if (level === 'low') {
    return `\n\nLength (creator preference: brief): Prefer short paragraphs and tight bullets. Minimize preamble unless the question is ambiguous.`
  }
  if (level === 'high') {
    return `\n\nLength (creator preference: more expressive): After tools, give a fuller summary when useful—brief context, implications, or options—without dumping raw tool output.`
  }
  return ''
}

/** One-off TTS script generation (intro / ongoing / what_next). */
export function managerTalkativenessVoiceScriptLine(level: ManagerTalkativeness): string {
  if (level === 'low') {
    return 'Keep the script compact—minimal padding, no long lists.'
  }
  if (level === 'high') {
    return 'You may use a slightly warmer, more narrative tone with short connective lines—still professional and not rambling.'
  }
  return 'Keep a natural manager tone: clear and efficient, with light framing only when it helps.'
}
