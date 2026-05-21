import type { UIMessage } from 'ai'
import { isTextUIPart } from 'ai'

/** Concatenate visible text from an AI SDK UI message (v6 `parts` model). */
export function textFromUiMessage(msg: UIMessage): string {
  return msg.parts.filter(isTextUIPart).map((p) => p.text).join('')
}
