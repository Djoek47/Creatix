import presetsJson from '@/lib/data/frame-edit-presets.json'

export type FrameEditPreset = {
  id: string
  label: string
  description: string
  tags: string[]
  hints: Record<string, unknown>
}

export function getFrameEditPresets(): FrameEditPreset[] {
  const p = presetsJson as { presets?: FrameEditPreset[] }
  return Array.isArray(p.presets) ? p.presets : []
}

export function getFrameEditTagTaxonomy(): string[] {
  const p = presetsJson as { tagTaxonomy?: string[] }
  return Array.isArray(p.tagTaxonomy) ? p.tagTaxonomy : []
}
