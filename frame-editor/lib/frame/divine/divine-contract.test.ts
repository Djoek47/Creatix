import { describe, expect, it, vi } from 'vitest'
import { parseDivineActionPayload } from './actions'
import { applyDivineEditorActions, dryRunDivineEditorActions } from './action-applier'

describe('divine action contract pipeline', () => {
  it('parses signed payloads, previews outcomes, and applies valid mutations', () => {
    const parsed = parseDivineActionPayload(
      JSON.stringify({
        version: 1,
        source: 'divine-voice',
        issuedAt: new Date().toISOString(),
        nonce: 'nonce-contract-1',
        actions: [
          { type: 'set_trace_recipient', recipientKey: 'fan-alpha' },
          { type: 'clear_trace_recipient' },
          { type: 'set_trace_batch_recipients', recipients: ['fan-alpha', 'fan-beta'] },
          { type: 'clear_trace_batch_recipients' },
          { type: 'set_image_clip_duration', clipId: 'clip-img-1', durationSec: 7 },
          { type: 'set_clip_trim', clipId: 'clip-img-1', inSec: 1, outSec: 4 },
          { type: 'set_clip_crop', clipId: 'clip-img-1', x: 0.1, y: 0.1, w: 0.8, h: 0.8 },
          { type: 'focus_clip_export', clipId: 'clip-missing' },
        ],
      }),
      { requireEnvelope: true },
    )

    expect(parsed.envelope?.source).toBe('divine-voice')
    expect(parsed.actions).toHaveLength(8)

    const dryRun = dryRunDivineEditorActions(parsed.actions, {
      hasClip: (clipId) => clipId === 'clip-img-1',
      hasImageClip: (clipId) => clipId === 'clip-img-1',
      hasVisualClip: (clipId) => clipId === 'clip-img-1',
    })

    expect(dryRun.map((result) => result.ok)).toEqual([true, true, true, true, true, true, true, false])
    expect(dryRun[7]?.detail).toContain('not found')

    const ctx = {
      setProjectName: vi.fn(),
      addPlaceholderClip: vi.fn(),
      setExportFormat: vi.fn(),
      setAspectPreset: vi.fn(),
      setTraceRecipientKey: vi.fn(),
      setTraceBatchRaw: vi.fn(),
      focusClipInExport: vi.fn(),
      hasClip: vi.fn((clipId: string) => clipId === 'clip-img-1'),
      hasImageClip: vi.fn((clipId: string) => clipId === 'clip-img-1'),
      hasVisualClip: vi.fn((clipId: string) => clipId === 'clip-img-1'),
      setImageClipDuration: vi.fn(),
      setClipTrim: vi.fn(),
      setClipCrop: vi.fn(),
    }

    const applied = applyDivineEditorActions(parsed.actions, ctx)

    expect(applied.map((result) => result.ok)).toEqual([true, true, true, true, true, true, true, false])
    expect(ctx.setTraceRecipientKey).toHaveBeenCalledWith('fan-alpha')
    expect(ctx.setTraceRecipientKey).toHaveBeenCalledWith('')
    expect(ctx.setTraceBatchRaw).toHaveBeenCalledWith('fan-alpha\nfan-beta')
    expect(ctx.setTraceBatchRaw).toHaveBeenCalledWith('')
    expect(ctx.setImageClipDuration).toHaveBeenCalledWith('clip-img-1', 7)
    expect(ctx.setClipTrim).toHaveBeenCalledWith('clip-img-1', 1, 4)
    expect(ctx.setClipCrop).toHaveBeenCalledWith('clip-img-1', { x: 0.1, y: 0.1, w: 0.8, h: 0.8 })
    expect(ctx.focusClipInExport).not.toHaveBeenCalled()
  })
})
