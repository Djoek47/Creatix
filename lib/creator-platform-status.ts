import { z } from 'zod'

export const CREATOR_STATUS_PRESETS = ['available', 'away', 'busy', 'dnd', 'custom'] as const

export type CreatorStatusPreset = (typeof CREATOR_STATUS_PRESETS)[number]

export const creatorStatusPresetSchema = z.enum(CREATOR_STATUS_PRESETS)

const CREATOR_STATUS_LABELS: Record<CreatorStatusPreset, string> = {
  available: 'Available',
  away: 'Away',
  busy: 'Busy',
  dnd: 'Do not disturb',
  custom: 'Custom',
}

export function normalizeCreatorStatusPreset(value: unknown): CreatorStatusPreset {
  const parsed = creatorStatusPresetSchema.safeParse(value)
  return parsed.success ? parsed.data : 'available'
}

export function normalizeCreatorStatusDetail(value: unknown, maxLength = 120): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

export function formatCreatorStatusLabel(
  presetValue: unknown,
  detailValue: unknown,
): string | null {
  const preset = normalizeCreatorStatusPreset(presetValue)
  const detail = normalizeCreatorStatusDetail(detailValue)

  if (preset === 'custom') {
    return detail ?? 'Custom'
  }

  return detail ? `${CREATOR_STATUS_LABELS[preset]} - ${detail}` : CREATOR_STATUS_LABELS[preset]
}

export function getCreatorStatusPresetLabel(presetValue: unknown): string {
  return CREATOR_STATUS_LABELS[normalizeCreatorStatusPreset(presetValue)]
}
