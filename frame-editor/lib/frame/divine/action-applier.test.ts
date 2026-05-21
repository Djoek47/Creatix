import { describe, expect, it, vi } from 'vitest'
import { applyDivineEditorActions, dryRunDivineEditorActions } from './action-applier'
import type { DivineEditorAction } from './actions'

function buildContext(hasClip = true, hasImageClip = true, hasVisualClip = true) {
  return {
    setProjectName: vi.fn(),
    addPlaceholderClip: vi.fn(),
    setExportFormat: vi.fn(),
    setAspectPreset: vi.fn(),
    setTraceRecipientKey: vi.fn(),
    setTraceBatchRaw: vi.fn(),
    focusClipInExport: vi.fn(),
    setImageClipDuration: vi.fn(),
    setClipTrim: vi.fn(),
    setClipCrop: vi.fn(),
    hasClip: vi.fn(() => hasClip),
    hasImageClip: vi.fn(() => hasImageClip),
    hasVisualClip: vi.fn(() => hasVisualClip),
  }
}

describe('applyDivineEditorActions', () => {
  it('applies supported actions and reports success', () => {
    const ctx = buildContext(true)
    const actions: DivineEditorAction[] = [
      { type: 'set_project_name', name: 'Campaign One' },
      { type: 'set_export_format', format: 'webm' },
      { type: 'set_aspect_preset', aspect: '16:9' },
      { type: 'set_trace_recipient', recipientKey: 'fan-001' },
      { type: 'clear_trace_recipient' },
      { type: 'set_trace_batch_recipients', recipients: ['fan-001', 'fan-002'] },
      { type: 'clear_trace_batch_recipients' },
      { type: 'focus_clip_export', clipId: 'clip-12' },
      { type: 'set_image_clip_duration', clipId: 'clip-img-1', durationSec: 8 },
      { type: 'set_clip_trim', clipId: 'clip-12', inSec: 1, outSec: 5 },
      { type: 'set_clip_crop', clipId: 'clip-12', x: 0.1, y: 0.2, w: 0.8, h: 0.7 },
      { type: 'add_placeholder_clip', count: 2 },
    ]

    const results = applyDivineEditorActions(actions, ctx)

    expect(results).toHaveLength(actions.length)
    expect(results.every((r) => r.ok)).toBe(true)
    expect(ctx.setProjectName).toHaveBeenCalledWith('Campaign One')
    expect(ctx.setExportFormat).toHaveBeenCalledWith('webm')
    expect(ctx.setAspectPreset).toHaveBeenCalledWith('16:9')
    expect(ctx.setTraceRecipientKey).toHaveBeenCalledWith('fan-001')
    expect(ctx.setTraceRecipientKey).toHaveBeenCalledWith('')
    expect(ctx.setTraceBatchRaw).toHaveBeenCalledWith('fan-001\nfan-002')
    expect(ctx.setTraceBatchRaw).toHaveBeenCalledWith('')
    expect(ctx.focusClipInExport).toHaveBeenCalledWith('clip-12')
    expect(ctx.setImageClipDuration).toHaveBeenCalledWith('clip-img-1', 8)
    expect(ctx.setClipTrim).toHaveBeenCalledWith('clip-12', 1, 5)
    expect(ctx.setClipCrop).toHaveBeenCalledWith('clip-12', { x: 0.1, y: 0.2, w: 0.8, h: 0.7 })
    expect(ctx.addPlaceholderClip).toHaveBeenCalledTimes(2)
  })

  it('returns failed result when focus clip is missing', () => {
    const ctx = buildContext(false)
    const actions: DivineEditorAction[] = [{ type: 'focus_clip_export', clipId: 'clip-missing' }]

    const results = applyDivineEditorActions(actions, ctx)

    expect(results).toHaveLength(1)
    expect(results[0]?.ok).toBe(false)
    expect(ctx.focusClipInExport).not.toHaveBeenCalled()
  })

  it('returns failed result when image clip action targets non-image media', () => {
    const ctx = buildContext(true, false)
    const actions: DivineEditorAction[] = [{ type: 'set_image_clip_duration', clipId: 'clip-video-1', durationSec: 6 }]

    const results = applyDivineEditorActions(actions, ctx)

    expect(results).toHaveLength(1)
    expect(results[0]?.ok).toBe(false)
    expect(ctx.setImageClipDuration).not.toHaveBeenCalled()
  })

  it('returns failed result for crop action on non-visual clip', () => {
    const ctx = buildContext(true, true, false)
    const actions: DivineEditorAction[] = [{ type: 'set_clip_crop', clipId: 'clip-audio-1', x: 0, y: 0, w: 1, h: 1 }]
    const results = applyDivineEditorActions(actions, ctx)
    expect(results[0]?.ok).toBe(false)
    expect(ctx.setClipCrop).not.toHaveBeenCalled()
  })
})

describe('dryRunDivineEditorActions', () => {
  it('does not mutate stateful callbacks and still validates clips', () => {
    const ctx = buildContext(false, false, false)
    const actions: DivineEditorAction[] = [
      { type: 'set_project_name', name: 'Dry Run' },
      { type: 'focus_clip_export', clipId: 'clip-missing' },
      { type: 'clear_trace_recipient' },
      { type: 'set_trace_batch_recipients', recipients: ['dry-1', 'dry-2'] },
      { type: 'clear_trace_batch_recipients' },
      { type: 'set_image_clip_duration', clipId: 'clip-video-2', durationSec: 5 },
      { type: 'set_clip_trim', clipId: 'clip-missing-2', inSec: 1, outSec: 3 },
      { type: 'set_clip_crop', clipId: 'clip-video-2', x: 0, y: 0, w: 1, h: 1 },
    ]

    const results = dryRunDivineEditorActions(actions, {
      hasClip: ctx.hasClip,
      hasImageClip: ctx.hasImageClip,
      hasVisualClip: ctx.hasVisualClip,
    })

    expect(results).toHaveLength(8)
    expect(results[0]?.ok).toBe(true)
    expect(results[1]?.ok).toBe(false)
    expect(results[2]?.ok).toBe(true)
    expect(results[3]?.ok).toBe(true)
    expect(results[4]?.ok).toBe(true)
    expect(results[5]?.ok).toBe(false)
    expect(results[6]?.ok).toBe(false)
    expect(results[7]?.ok).toBe(false)
    expect(ctx.setProjectName).not.toHaveBeenCalled()
    expect(ctx.setTraceRecipientKey).not.toHaveBeenCalled()
    expect(ctx.setTraceBatchRaw).not.toHaveBeenCalled()
    expect(ctx.focusClipInExport).not.toHaveBeenCalled()
    expect(ctx.setImageClipDuration).not.toHaveBeenCalled()
    expect(ctx.setClipTrim).not.toHaveBeenCalled()
    expect(ctx.setClipCrop).not.toHaveBeenCalled()
  })
})
