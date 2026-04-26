export type FocusedClipInput = {
  id?: string
  mediaName?: string
  trackLabel?: string
  startSec?: number
  endSec?: number
  durationSec?: number
}

export type NormalizedFocusedClip = {
  id?: string
  mediaName?: string
  trackLabel?: string
  startSec?: number
  endSec?: number
  durationSec?: number
}

export function normalizeFocusedClip(
  lineageFocusedClip?: FocusedClipInput | null,
  topLevelFocusedClip?: FocusedClipInput | null,
): NormalizedFocusedClip | undefined {
  const input = isObject(lineageFocusedClip) ? lineageFocusedClip : isObject(topLevelFocusedClip) ? topLevelFocusedClip : null
  if (!input) return undefined
  return {
    id: typeof input.id === 'string' ? input.id : undefined,
    mediaName: typeof input.mediaName === 'string' ? input.mediaName : undefined,
    trackLabel: typeof input.trackLabel === 'string' ? input.trackLabel : undefined,
    startSec: typeof input.startSec === 'number' ? input.startSec : undefined,
    endSec: typeof input.endSec === 'number' ? input.endSec : undefined,
    durationSec: typeof input.durationSec === 'number' ? input.durationSec : undefined,
  }
}

export function buildRenderEmbedIdempotencyKey(input: {
  contentId: string
  recipientKey: string
  planHash: string
  format: string
  aspectPreset: string
  focusedClipId?: string
}): string {
  return `frame_render:${input.contentId}:${input.recipientKey}:${input.planHash}:${input.format}:${input.aspectPreset}:${input.focusedClipId || 'all'}`
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
