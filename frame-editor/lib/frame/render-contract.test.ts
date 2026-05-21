import { describe, expect, it } from 'vitest'
import { buildRenderEmbedIdempotencyKey, normalizeFocusedClip } from './render-contract'

describe('normalizeFocusedClip', () => {
  it('prefers lineage focused clip over top-level fallback', () => {
    const normalized = normalizeFocusedClip(
      {
        id: 'clip-lineage',
        mediaName: 'lineage.mp4',
      },
      {
        id: 'clip-top',
        mediaName: 'top.mp4',
      },
    )
    expect(normalized?.id).toBe('clip-lineage')
    expect(normalized?.mediaName).toBe('lineage.mp4')
  })

  it('falls back to top-level focused clip when lineage is missing', () => {
    const normalized = normalizeFocusedClip(undefined, {
      id: 'clip-top',
      mediaName: 'top.mp4',
      startSec: 5,
    })
    expect(normalized).toEqual({
      id: 'clip-top',
      mediaName: 'top.mp4',
      trackLabel: undefined,
      startSec: 5,
      endSec: undefined,
      durationSec: undefined,
    })
  })

  it('returns undefined when neither focused clip payload is valid', () => {
    const normalized = normalizeFocusedClip(undefined, undefined)
    expect(normalized).toBeUndefined()
  })
})

describe('buildRenderEmbedIdempotencyKey', () => {
  it('includes focused clip id when present', () => {
    const key = buildRenderEmbedIdempotencyKey({
      contentId: 'content-1',
      recipientKey: 'fan-7',
      planHash: 'abc123',
      format: 'mp4',
      aspectPreset: '9:16-of',
      focusedClipId: 'clip-1',
    })
    expect(key).toBe('frame_render:content-1:fan-7:abc123:mp4:9:16-of:clip-1')
  })

  it('falls back to all when no focused clip id', () => {
    const key = buildRenderEmbedIdempotencyKey({
      contentId: 'content-1',
      recipientKey: 'fan-7',
      planHash: 'abc123',
      format: 'mp4',
      aspectPreset: '9:16-of',
    })
    expect(key).toBe('frame_render:content-1:fan-7:abc123:mp4:9:16-of:all')
  })
})
