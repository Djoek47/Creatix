import type { AspectPreset, EditOutputFormat } from '@/lib/frame/export/edit-plan'
import { normalizeTraceBatchRecipientList } from '../trace/batch-recipients'

export type DivineEditorAction =
  | { type: 'set_project_name'; name: string }
  | { type: 'add_placeholder_clip'; count?: number }
  | { type: 'set_export_format'; format: EditOutputFormat }
  | { type: 'set_aspect_preset'; aspect: AspectPreset }
  | { type: 'set_trace_recipient'; recipientKey: string }
  | { type: 'clear_trace_recipient' }
  | { type: 'set_trace_batch_recipients'; recipients: string[] }
  | { type: 'clear_trace_batch_recipients' }
  | { type: 'focus_clip_export'; clipId: string }
  | { type: 'set_image_clip_duration'; clipId: string; durationSec: number }
  | { type: 'set_clip_trim'; clipId: string; inSec: number; outSec: number }
  | { type: 'set_clip_crop'; clipId: string; x: number; y: number; w: number; h: number }

export type DivineActionEnvelope = {
  version: 1
  source: string
  issuedAt: string
  nonce: string
  actions: DivineEditorAction[]
}

export function parseDivineActionStream(raw: string): DivineEditorAction[] {
  return parseDivineActionPayload(raw).actions
}

export function parseDivineActionPayload(
  raw: string,
  options?: {
    requireEnvelope?: boolean
    maxAgeMs?: number
  },
): {
  actions: DivineEditorAction[]
  envelope?: DivineActionEnvelope
} {
  const trimmed = raw.trim()
  if (!trimmed) return { actions: [] }
  const parsed = JSON.parse(trimmed) as unknown
  if (isEnvelopeShape(parsed)) {
    const envelope = parseEnvelope(parsed, options)
    return {
      actions: envelope.actions,
      envelope,
    }
  }
  if (options?.requireEnvelope) {
    throw new Error('Action envelope is required')
  }
  const actionsRaw = Array.isArray(parsed) ? parsed : [parsed]
  return {
    actions: actionsRaw.map(parseAction),
  }
}

function parseAction(input: unknown): DivineEditorAction {
  if (!input || typeof input !== 'object') {
    throw new Error('Action must be an object')
  }
  const candidate = input as Record<string, unknown>
  const type = typeof candidate.type === 'string' ? candidate.type : ''
  if (type === 'set_project_name') {
    const name = typeof candidate.name === 'string' ? candidate.name.trim() : ''
    if (!name) throw new Error('set_project_name requires non-empty name')
    return { type, name }
  }
  if (type === 'add_placeholder_clip') {
    const countRaw = candidate.count
    const count = typeof countRaw === 'number' && Number.isFinite(countRaw) ? Math.max(1, Math.min(5, Math.floor(countRaw))) : undefined
    return count ? { type, count } : { type }
  }
  if (type === 'set_export_format') {
    const format = typeof candidate.format === 'string' ? candidate.format : ''
    if (!isOutputFormat(format)) throw new Error('set_export_format requires valid format')
    return { type, format }
  }
  if (type === 'set_aspect_preset') {
    const aspect = typeof candidate.aspect === 'string' ? candidate.aspect : ''
    if (!isAspectPreset(aspect)) throw new Error('set_aspect_preset requires valid aspect')
    return { type, aspect }
  }
  if (type === 'set_trace_recipient') {
    const recipientKey = typeof candidate.recipientKey === 'string' ? candidate.recipientKey.trim() : ''
    if (!recipientKey) throw new Error('set_trace_recipient requires recipientKey')
    return { type, recipientKey }
  }
  if (type === 'clear_trace_recipient') {
    return { type }
  }
  if (type === 'set_trace_batch_recipients') {
    if (!Array.isArray(candidate.recipients)) {
      throw new Error('set_trace_batch_recipients requires recipients array')
    }
    const recipients = normalizeTraceBatchRecipientList(
      candidate.recipients.map((value) => (typeof value === 'string' ? value : '')),
    )
    if (!recipients.length) throw new Error('set_trace_batch_recipients requires at least one recipient')
    return { type, recipients }
  }
  if (type === 'clear_trace_batch_recipients') {
    return { type }
  }
  if (type === 'focus_clip_export') {
    const clipId = typeof candidate.clipId === 'string' ? candidate.clipId.trim() : ''
    if (!clipId) throw new Error('focus_clip_export requires clipId')
    return { type, clipId }
  }
  if (type === 'set_image_clip_duration') {
    const clipId = typeof candidate.clipId === 'string' ? candidate.clipId.trim() : ''
    if (!clipId) throw new Error('set_image_clip_duration requires clipId')
    const durationRaw = candidate.durationSec
    if (typeof durationRaw !== 'number' || !Number.isFinite(durationRaw)) {
      throw new Error('set_image_clip_duration requires numeric durationSec')
    }
    const durationSec = Math.max(1, Math.round(durationRaw))
    return { type, clipId, durationSec }
  }
  if (type === 'set_clip_trim') {
    const clipId = typeof candidate.clipId === 'string' ? candidate.clipId.trim() : ''
    if (!clipId) throw new Error('set_clip_trim requires clipId')
    const inRaw = candidate.inSec
    const outRaw = candidate.outSec
    if (typeof inRaw !== 'number' || !Number.isFinite(inRaw) || typeof outRaw !== 'number' || !Number.isFinite(outRaw)) {
      throw new Error('set_clip_trim requires numeric inSec/outSec')
    }
    const inSec = Math.max(0, Number(inRaw))
    const outSec = Math.max(inSec + 0.1, Number(outRaw))
    return { type, clipId, inSec, outSec }
  }
  if (type === 'set_clip_crop') {
    const clipId = typeof candidate.clipId === 'string' ? candidate.clipId.trim() : ''
    if (!clipId) throw new Error('set_clip_crop requires clipId')
    const xRaw = candidate.x
    const yRaw = candidate.y
    const wRaw = candidate.w
    const hRaw = candidate.h
    if (
      typeof xRaw !== 'number' ||
      !Number.isFinite(xRaw) ||
      typeof yRaw !== 'number' ||
      !Number.isFinite(yRaw) ||
      typeof wRaw !== 'number' ||
      !Number.isFinite(wRaw) ||
      typeof hRaw !== 'number' ||
      !Number.isFinite(hRaw)
    ) {
      throw new Error('set_clip_crop requires numeric x/y/w/h')
    }
    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
    return {
      type,
      clipId,
      x: clamp(Number(xRaw), 0, 1),
      y: clamp(Number(yRaw), 0, 1),
      w: clamp(Number(wRaw), 0.05, 1),
      h: clamp(Number(hRaw), 0.05, 1),
    }
  }
  throw new Error(`Unsupported action type: ${type || '(missing type)'}`)
}

function isOutputFormat(value: string): value is EditOutputFormat {
  return ['mp4', 'mov', 'webm', 'gif', 'jpg', 'png', 'webp'].includes(value)
}

function isAspectPreset(value: string): value is AspectPreset {
  return ['9:16-of', '9:16-fansly', '1:1', '16:9', '4:5'].includes(value)
}

function isEnvelopeShape(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return Array.isArray(candidate.actions) && typeof candidate.version !== 'undefined'
}

function parseEnvelope(
  value: Record<string, unknown>,
  options?: {
    requireEnvelope?: boolean
    maxAgeMs?: number
  },
): DivineActionEnvelope {
  const version = value.version
  if (version !== 1) throw new Error('Unsupported envelope version')
  const source = typeof value.source === 'string' ? value.source.trim() : ''
  if (!source) throw new Error('Envelope source is required')
  const issuedAt = typeof value.issuedAt === 'string' ? value.issuedAt.trim() : ''
  if (!issuedAt) throw new Error('Envelope issuedAt is required')
  const issuedAtMs = Date.parse(issuedAt)
  if (!Number.isFinite(issuedAtMs)) throw new Error('Envelope issuedAt is invalid')
  const maxAgeMs = typeof options?.maxAgeMs === 'number' ? options.maxAgeMs : 10 * 60 * 1000
  if (Date.now() - issuedAtMs > maxAgeMs) throw new Error('Action envelope is stale')
  const nonce = typeof value.nonce === 'string' ? value.nonce.trim() : ''
  if (!nonce) throw new Error('Envelope nonce is required')
  const rawActions = Array.isArray(value.actions) ? value.actions : []
  if (!rawActions.length) throw new Error('Envelope requires at least one action')
  return {
    version: 1,
    source,
    issuedAt,
    nonce,
    actions: rawActions.map(parseAction),
  }
}
