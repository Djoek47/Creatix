import type { DivineDashboardPreset, DivineManagerAutomationRules } from '@/lib/divine-manager'
import { listFeaturedToolCandidates } from '@/lib/dashboard/featured-tool-options'

const MOODS = ['minimal', 'operations', 'creative'] as const
const ACCENTS = ['circe', 'venus', 'gold', 'balanced'] as const

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x)
}

/** Coerce unknown JSON to a partial preset (drops invalid keys). */
export function sanitizeDashboardPresetPartial(raw: unknown): Partial<DivineDashboardPreset> {
  if (!isRecord(raw)) return {}
  const out: Partial<DivineDashboardPreset> = {}

  if (typeof raw.presetId === 'string' && raw.presetId.trim()) {
    out.presetId = raw.presetId.trim().slice(0, 80)
  }
  if (typeof raw.mood === 'string' && (MOODS as readonly string[]).includes(raw.mood)) {
    out.mood = raw.mood as DivineDashboardPreset['mood']
  }
  if (typeof raw.accent === 'string' && (ACCENTS as readonly string[]).includes(raw.accent)) {
    out.accent = raw.accent as DivineDashboardPreset['accent']
  }
  if (typeof raw.featuredStoryCopyId === 'string' && raw.featuredStoryCopyId.trim()) {
    out.featuredStoryCopyId = raw.featuredStoryCopyId.trim().slice(0, 120)
  }
  if (typeof raw.featuredToolId === 'string' && raw.featuredToolId.trim()) {
    const id = raw.featuredToolId.trim().slice(0, 80)
    const allowed = new Set(listFeaturedToolCandidates().map((t) => t.id))
    if (allowed.has(id)) out.featuredToolId = id
  }
  if (typeof raw.presetVersion === 'number' && Number.isFinite(raw.presetVersion)) {
    out.presetVersion = Math.max(0, Math.floor(raw.presetVersion))
  }
  if (isRecord(raw.widgetVisibility)) {
    const vis: Record<string, boolean> = {}
    for (const [k, v] of Object.entries(raw.widgetVisibility)) {
      if (typeof k === 'string' && k.length <= 64 && typeof v === 'boolean') vis[k] = v
    }
    if (Object.keys(vis).length) out.widgetVisibility = vis
  }
  return out
}

/** DB preset first, then optional local visibility overrides (same keys as dashboard widget ids). */
export function mergeDashboardVisibility(
  defaultVisibility: Record<string, boolean>,
  presetWidgetVisibility: Record<string, boolean> | undefined | null,
  localVisibility: Record<string, boolean> | null | undefined,
): Record<string, boolean> {
  let v: Record<string, boolean> = { ...defaultVisibility, ...(presetWidgetVisibility ?? {}) }
  if (localVisibility && typeof localVisibility === 'object') {
    v = { ...v, ...localVisibility }
  }
  return v
}

export function extractDashboardPreset(automationRules: unknown): DivineDashboardPreset | null {
  if (!isRecord(automationRules)) return null
  const d = automationRules.dashboard
  const partial = sanitizeDashboardPresetPartial(d)
  if (Object.keys(partial).length === 0) return null
  return partial as DivineDashboardPreset
}

/**
 * Merge a dashboard patch into existing automation_rules (deep-merge widgetVisibility).
 * Always sets `updatedAt` on the dashboard object.
 */
export function mergeDashboardPresetIntoRules(
  existing: DivineManagerAutomationRules | Record<string, unknown> | null | undefined,
  patch: Partial<DivineDashboardPreset>,
): DivineManagerAutomationRules {
  const base = (existing && typeof existing === 'object' ? existing : {}) as DivineManagerAutomationRules
  const prev = sanitizeDashboardPresetPartial(base.dashboard)

  const nextVis =
    patch.widgetVisibility != null
      ? { ...(prev.widgetVisibility ?? {}), ...patch.widgetVisibility }
      : prev.widgetVisibility

  const merged: DivineDashboardPreset = {
    ...prev,
    ...patch,
    ...(nextVis != null ? { widgetVisibility: nextVis } : {}),
    updatedAt: new Date().toISOString(),
  }

  return { ...base, dashboard: merged }
}

/** Build a patch from Divine Manager tool arguments. */
export function dashboardPatchFromToolArgs(args: Record<string, unknown>): Partial<DivineDashboardPreset> {
  const raw: Record<string, unknown> = { ...args }
  if (raw.widgetVisibility != null && isRecord(raw.widgetVisibility)) {
    // already object
  } else if (Array.isArray(args.visible_widgets)) {
    const vis: Record<string, boolean> = {}
    for (const id of args.visible_widgets) {
      if (typeof id === 'string' && id.trim()) vis[id.trim()] = true
    }
    raw.widgetVisibility = vis
    delete raw.visible_widgets
  }
  return sanitizeDashboardPresetPartial(raw)
}
