import { describe, expect, it } from 'vitest'
import { parseDivineActionPayload } from './actions'

describe('parseDivineActionPayload', () => {
  it('parses raw unsigned action arrays', () => {
    const payload = parseDivineActionPayload(
      JSON.stringify([
        { type: 'set_project_name', name: 'Launch Reel' },
        { type: 'set_export_format', format: 'mov' },
        { type: 'clear_trace_recipient' },
        { type: 'set_trace_batch_recipients', recipients: ['fan-1', 'fan-2', ' fan-1 ', ''] },
        { type: 'clear_trace_batch_recipients' },
        { type: 'set_image_clip_duration', clipId: 'clip-img-1', durationSec: 6.2 },
        { type: 'set_clip_trim', clipId: 'clip-img-1', inSec: 1.2, outSec: 5.8 },
        { type: 'set_clip_crop', clipId: 'clip-img-1', x: -2, y: 0.2, w: 5, h: 0.01 },
      ]),
    )
    expect(payload.actions).toHaveLength(8)
    expect(payload.envelope).toBeUndefined()
    expect(payload.actions[0]).toEqual({ type: 'set_project_name', name: 'Launch Reel' })
    expect(payload.actions[2]).toEqual({ type: 'clear_trace_recipient' })
    expect(payload.actions[3]).toEqual({ type: 'set_trace_batch_recipients', recipients: ['fan-1', 'fan-2'] })
    expect(payload.actions[4]).toEqual({ type: 'clear_trace_batch_recipients' })
    expect(payload.actions[5]).toEqual({ type: 'set_image_clip_duration', clipId: 'clip-img-1', durationSec: 6 })
    expect(payload.actions[6]).toEqual({ type: 'set_clip_trim', clipId: 'clip-img-1', inSec: 1.2, outSec: 5.8 })
    expect(payload.actions[7]).toEqual({ type: 'set_clip_crop', clipId: 'clip-img-1', x: 0, y: 0.2, w: 1, h: 0.05 })
  })

  it('parses signed envelopes and returns metadata', () => {
    const payload = parseDivineActionPayload(
      JSON.stringify({
        version: 1,
        source: 'divine-voice',
        issuedAt: new Date().toISOString(),
        nonce: 'nonce-123',
        actions: [{ type: 'set_trace_recipient', recipientKey: 'creator-alpha' }],
      }),
      { requireEnvelope: true },
    )
    expect(payload.envelope?.source).toBe('divine-voice')
    expect(payload.envelope?.nonce).toBe('nonce-123')
    expect(payload.actions).toEqual([{ type: 'set_trace_recipient', recipientKey: 'creator-alpha' }])
  })

  it('rejects unsigned payloads when envelope required', () => {
    expect(() =>
      parseDivineActionPayload(JSON.stringify({ type: 'set_project_name', name: 'No Envelope' }), { requireEnvelope: true }),
    ).toThrow('Action envelope is required')
  })

  it('rejects stale envelopes', () => {
    const staleIssuedAt = new Date(Date.now() - 60_000).toISOString()
    expect(() =>
      parseDivineActionPayload(
        JSON.stringify({
          version: 1,
          source: 'divine-voice',
          issuedAt: staleIssuedAt,
          nonce: 'nonce-stale',
          actions: [{ type: 'set_export_format', format: 'mp4' }],
        }),
        { requireEnvelope: true, maxAgeMs: 1_000 },
      ),
    ).toThrow('Action envelope is stale')
  })

  it('rejects unsupported envelope version', () => {
    expect(() =>
      parseDivineActionPayload(
        JSON.stringify({
          version: 2,
          source: 'divine-voice',
          issuedAt: new Date().toISOString(),
          nonce: 'nonce-v2',
          actions: [{ type: 'set_export_format', format: 'mp4' }],
        }),
        { requireEnvelope: true },
      ),
    ).toThrow('Unsupported envelope version')
  })

  it('rejects envelope missing source', () => {
    expect(() =>
      parseDivineActionPayload(
        JSON.stringify({
          version: 1,
          issuedAt: new Date().toISOString(),
          nonce: 'nonce-no-source',
          actions: [{ type: 'set_export_format', format: 'mp4' }],
        }),
        { requireEnvelope: true },
      ),
    ).toThrow('Envelope source is required')
  })

  it('rejects envelope missing nonce', () => {
    expect(() =>
      parseDivineActionPayload(
        JSON.stringify({
          version: 1,
          source: 'divine-voice',
          issuedAt: new Date().toISOString(),
          actions: [{ type: 'set_export_format', format: 'mp4' }],
        }),
        { requireEnvelope: true },
      ),
    ).toThrow('Envelope nonce is required')
  })

  it('rejects envelope with invalid issuedAt', () => {
    expect(() =>
      parseDivineActionPayload(
        JSON.stringify({
          version: 1,
          source: 'divine-voice',
          issuedAt: 'not-a-date',
          nonce: 'nonce-bad-date',
          actions: [{ type: 'set_export_format', format: 'mp4' }],
        }),
        { requireEnvelope: true },
      ),
    ).toThrow('Envelope issuedAt is invalid')
  })

  it('rejects envelope with empty actions list', () => {
    expect(() =>
      parseDivineActionPayload(
        JSON.stringify({
          version: 1,
          source: 'divine-voice',
          issuedAt: new Date().toISOString(),
          nonce: 'nonce-empty-actions',
          actions: [],
        }),
        { requireEnvelope: true },
      ),
    ).toThrow('Envelope requires at least one action')
  })

  it('rejects invalid image duration actions', () => {
    expect(() =>
      parseDivineActionPayload(
        JSON.stringify([{ type: 'set_image_clip_duration', clipId: 'clip-img-1', durationSec: 'fast' }]),
      ),
    ).toThrow('set_image_clip_duration requires numeric durationSec')
  })

  it('rejects invalid trim and crop action payloads', () => {
    expect(() =>
      parseDivineActionPayload(JSON.stringify([{ type: 'set_clip_trim', clipId: 'clip-1', inSec: 'start', outSec: 4 }])),
    ).toThrow('set_clip_trim requires numeric inSec/outSec')
    expect(() =>
      parseDivineActionPayload(JSON.stringify([{ type: 'set_clip_crop', clipId: 'clip-1', x: 0, y: 0, w: 'wide', h: 1 }])),
    ).toThrow('set_clip_crop requires numeric x/y/w/h')
  })

  it('rejects invalid trace batch recipient actions', () => {
    expect(() => parseDivineActionPayload(JSON.stringify([{ type: 'set_trace_batch_recipients', recipients: [] }]))).toThrow(
      'set_trace_batch_recipients requires at least one recipient',
    )
  })

  it('normalizes, de-duplicates, and preserves first-seen ordering for batch recipients', () => {
    const payload = parseDivineActionPayload(
      JSON.stringify([
        {
          type: 'set_trace_batch_recipients',
          recipients: [' fan-b ', 'fan-a', 'fan-b', 'fan-c', 'fan-a'],
        },
      ]),
    )

    expect(payload.actions).toEqual([{ type: 'set_trace_batch_recipients', recipients: ['fan-b', 'fan-a', 'fan-c'] }])
  })

  it('caps batch recipients to maximum allowed entries', () => {
    const recipients = Array.from({ length: 80 }, (_, index) => `fan-${index}`)
    const payload = parseDivineActionPayload(JSON.stringify([{ type: 'set_trace_batch_recipients', recipients }]))
    const action = payload.actions[0]
    if (!action || action.type !== 'set_trace_batch_recipients') {
      throw new Error('Expected set_trace_batch_recipients action')
    }
    expect(action.recipients).toHaveLength(50)
    expect(action.recipients[0]).toBe('fan-0')
    expect(action.recipients[49]).toBe('fan-49')
  })

  it('applies dedupe before cap for divine batch recipients', () => {
    const recipients = [...Array.from({ length: 60 }, () => 'fan-dup'), ...Array.from({ length: 80 }, (_, i) => `fan-${i}`)]
    const payload = parseDivineActionPayload(JSON.stringify([{ type: 'set_trace_batch_recipients', recipients }]))
    const action = payload.actions[0]
    if (!action || action.type !== 'set_trace_batch_recipients') {
      throw new Error('Expected set_trace_batch_recipients action')
    }
    expect(action.recipients).toHaveLength(50)
    expect(action.recipients[0]).toBe('fan-dup')
    expect(action.recipients[1]).toBe('fan-0')
    expect(action.recipients[49]).toBe('fan-48')
  })
})
