import type { AspectPreset, EditOutputFormat } from '@/lib/frame/export/edit-plan'
import type { DivineEditorAction } from '@/lib/frame/divine/actions'

type ApplyContext = {
  setProjectName: (name: string) => void
  addPlaceholderClip: () => void
  setExportFormat: (format: EditOutputFormat) => void
  setAspectPreset: (aspect: AspectPreset) => void
  setTraceRecipientKey: (value: string) => void
  setTraceBatchRaw: (value: string) => void
  focusClipInExport: (clipId: string) => void
  hasClip: (clipId: string) => boolean
  hasImageClip: (clipId: string) => boolean
  hasVisualClip: (clipId: string) => boolean
  setImageClipDuration: (clipId: string, durationSec: number) => void
  setClipTrim: (clipId: string, inSec: number, outSec: number) => void
  setClipCrop: (clipId: string, crop: { x: number; y: number; w: number; h: number }) => void
}

export type AppliedDivineAction = {
  action: DivineEditorAction
  ok: boolean
  detail: string
}

export function applyDivineEditorActions(
  actions: DivineEditorAction[],
  context: ApplyContext,
): AppliedDivineAction[] {
  const results: AppliedDivineAction[] = []
  for (const action of actions) {
    if (action.type === 'set_project_name') {
      context.setProjectName(action.name)
      results.push({ action, ok: true, detail: `Project renamed to "${action.name}"` })
      continue
    }
    if (action.type === 'add_placeholder_clip') {
      const count = action.count ?? 1
      for (let i = 0; i < count; i++) context.addPlaceholderClip()
      results.push({ action, ok: true, detail: `Added ${count} placeholder clip${count === 1 ? '' : 's'}` })
      continue
    }
    if (action.type === 'set_export_format') {
      context.setExportFormat(action.format)
      results.push({ action, ok: true, detail: `Export format set to ${action.format}` })
      continue
    }
    if (action.type === 'set_aspect_preset') {
      context.setAspectPreset(action.aspect)
      results.push({ action, ok: true, detail: `Aspect preset set to ${action.aspect}` })
      continue
    }
    if (action.type === 'set_trace_recipient') {
      context.setTraceRecipientKey(action.recipientKey)
      results.push({ action, ok: true, detail: `Trace recipient set to ${action.recipientKey}` })
      continue
    }
    if (action.type === 'clear_trace_recipient') {
      context.setTraceRecipientKey('')
      results.push({ action, ok: true, detail: 'Trace recipient cleared' })
      continue
    }
    if (action.type === 'set_trace_batch_recipients') {
      context.setTraceBatchRaw(action.recipients.join('\n'))
      results.push({ action, ok: true, detail: `Trace batch recipients set (${action.recipients.length})` })
      continue
    }
    if (action.type === 'clear_trace_batch_recipients') {
      context.setTraceBatchRaw('')
      results.push({ action, ok: true, detail: 'Trace batch recipients cleared' })
      continue
    }
    if (action.type === 'focus_clip_export') {
      if (!context.hasClip(action.clipId)) {
        results.push({ action, ok: false, detail: `Clip "${action.clipId}" was not found in timeline` })
        continue
      }
      context.focusClipInExport(action.clipId)
      results.push({ action, ok: true, detail: `Focused clip ${action.clipId} in export view` })
      continue
    }
    if (action.type === 'set_image_clip_duration') {
      if (!context.hasImageClip(action.clipId)) {
        results.push({ action, ok: false, detail: `Clip "${action.clipId}" is not an image clip` })
        continue
      }
      context.setImageClipDuration(action.clipId, action.durationSec)
      results.push({ action, ok: true, detail: `Set image clip ${action.clipId} duration to ${action.durationSec}s` })
      continue
    }
    if (action.type === 'set_clip_trim') {
      if (!context.hasClip(action.clipId)) {
        results.push({ action, ok: false, detail: `Clip "${action.clipId}" was not found in timeline` })
        continue
      }
      context.setClipTrim(action.clipId, action.inSec, action.outSec)
      results.push({ action, ok: true, detail: `Set clip ${action.clipId} trim window to ${action.inSec}s -> ${action.outSec}s` })
      continue
    }
    if (action.type === 'set_clip_crop') {
      if (!context.hasVisualClip(action.clipId)) {
        results.push({ action, ok: false, detail: `Clip "${action.clipId}" is not a visual clip` })
        continue
      }
      context.setClipCrop(action.clipId, { x: action.x, y: action.y, w: action.w, h: action.h })
      results.push({ action, ok: true, detail: `Set clip ${action.clipId} crop to x:${action.x} y:${action.y} w:${action.w} h:${action.h}` })
    }
  }
  return results
}

export function dryRunDivineEditorActions(
  actions: DivineEditorAction[],
  context: Pick<ApplyContext, 'hasClip' | 'hasImageClip' | 'hasVisualClip'>,
): AppliedDivineAction[] {
  const results: AppliedDivineAction[] = []
  for (const action of actions) {
    if (action.type === 'set_project_name') {
      results.push({ action, ok: true, detail: `Would rename project to "${action.name}"` })
      continue
    }
    if (action.type === 'add_placeholder_clip') {
      const count = action.count ?? 1
      results.push({ action, ok: true, detail: `Would add ${count} placeholder clip${count === 1 ? '' : 's'}` })
      continue
    }
    if (action.type === 'set_export_format') {
      results.push({ action, ok: true, detail: `Would set export format to ${action.format}` })
      continue
    }
    if (action.type === 'set_aspect_preset') {
      results.push({ action, ok: true, detail: `Would set aspect preset to ${action.aspect}` })
      continue
    }
    if (action.type === 'set_trace_recipient') {
      results.push({ action, ok: true, detail: `Would set trace recipient to ${action.recipientKey}` })
      continue
    }
    if (action.type === 'clear_trace_recipient') {
      results.push({ action, ok: true, detail: 'Would clear trace recipient' })
      continue
    }
    if (action.type === 'set_trace_batch_recipients') {
      results.push({ action, ok: true, detail: `Would set trace batch recipients (${action.recipients.length})` })
      continue
    }
    if (action.type === 'clear_trace_batch_recipients') {
      results.push({ action, ok: true, detail: 'Would clear trace batch recipients' })
      continue
    }
    if (action.type === 'focus_clip_export') {
      if (!context.hasClip(action.clipId)) {
        results.push({ action, ok: false, detail: `Clip "${action.clipId}" would fail (not found in timeline)` })
        continue
      }
      results.push({ action, ok: true, detail: `Would focus clip ${action.clipId} in export view` })
      continue
    }
    if (action.type === 'set_image_clip_duration') {
      if (!context.hasImageClip(action.clipId)) {
        results.push({ action, ok: false, detail: `Clip "${action.clipId}" would fail (not an image clip)` })
        continue
      }
      results.push({ action, ok: true, detail: `Would set image clip ${action.clipId} duration to ${action.durationSec}s` })
      continue
    }
    if (action.type === 'set_clip_trim') {
      if (!context.hasClip(action.clipId)) {
        results.push({ action, ok: false, detail: `Clip "${action.clipId}" would fail (not found in timeline)` })
        continue
      }
      results.push({ action, ok: true, detail: `Would set clip ${action.clipId} trim window to ${action.inSec}s -> ${action.outSec}s` })
      continue
    }
    if (action.type === 'set_clip_crop') {
      if (!context.hasVisualClip(action.clipId)) {
        results.push({ action, ok: false, detail: `Clip "${action.clipId}" would fail (not a visual clip)` })
        continue
      }
      results.push({ action, ok: true, detail: `Would set clip ${action.clipId} crop to x:${action.x} y:${action.y} w:${action.w} h:${action.h}` })
      continue
    }
  }
  return results
}
