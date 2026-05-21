export type BrandToneTag =
  | 'luxury'
  | 'playful'
  | 'mysterious'
  | 'confident'
  | 'romantic'
  | 'minimal'
  | 'bold'
  | 'intimate'

export type BrandEnforcementMode = 'off' | 'warn' | 'block'

export type BrandLogoAsset = {
  id: string
  label: string
  url: string
  kind: 'primary' | 'secondary' | 'icon' | 'watermark'
  darkBgSafe?: boolean
  lightBgSafe?: boolean
  minSizePx?: number
  clearspacePx?: number
}

export type BrandPalette = {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
}

export type BrandTypography = {
  heading: string
  body: string
  accent?: string
}

export type BrandWatermarkDefaults = {
  enabled: boolean
  logoAssetId?: string
  placement: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  opacityPct: number
  scalePct: number
  marginPx: number
  traceRecipientPrefix: string
}

export type BrandGovernance = {
  enforcementMode: BrandEnforcementMode
  editorUserIds?: string[]
  approverUserIds?: string[]
}

export type BrandProfileV1 = {
  version: 1
  brandName: string
  tagline?: string
  audience?: string
  useBrandContextForAi: boolean
  betaAcknowledged: boolean
  toneTags: BrandToneTag[]
  doSay: string[]
  dontSay: string[]
  bannedPhrases: string[]
  socialHandles: Record<string, string>
  palette: BrandPalette
  typography: BrandTypography
  logos: BrandLogoAsset[]
  watermarkDefaults: BrandWatermarkDefaults
  governance: BrandGovernance
  notes?: string
  updatedAt?: string
}

const HEX_RE = /^#?[0-9a-fA-F]{6}$/
const HANDLE_RE = /^@?[\w.\-]{1,60}$/

function clampStr(v: unknown, max = 200): string {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, max)
}

function normalizeHex(v: unknown, fallback: string): string {
  if (typeof v !== 'string') return fallback
  const t = v.trim()
  if (!t) return fallback
  const norm = t.startsWith('#') ? t : `#${t}`
  return HEX_RE.test(norm) ? norm.toUpperCase() : fallback
}

function sanitizeStringArray(input: unknown, opts: { maxItems: number; maxLen: number }): string[] {
  if (!Array.isArray(input)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of input) {
    if (typeof raw !== 'string') continue
    const t = raw.trim().slice(0, opts.maxLen)
    if (!t) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
    if (out.length >= opts.maxItems) break
  }
  return out
}

function sanitizeHandles(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [rawK, rawV] of Object.entries(input as Record<string, unknown>)) {
    const key = clampStr(rawK, 40).toLowerCase()
    const value = clampStr(rawV, 80)
    if (!key || !value) continue
    if (!HANDLE_RE.test(value)) continue
    out[key] = value.startsWith('@') ? value : `@${value}`
  }
  return out
}

function sanitizeLogos(input: unknown): BrandLogoAsset[] {
  if (!Array.isArray(input)) return []
  const out: BrandLogoAsset[] = []
  for (const row of input) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const id = clampStr(r.id || crypto.randomUUID(), 120)
    const label = clampStr(r.label, 80)
    const url = clampStr(r.url, 2000)
    const kind =
      r.kind === 'secondary' || r.kind === 'icon' || r.kind === 'watermark' ? r.kind : 'primary'
    if (!id || !url) continue
    out.push({
      id,
      label: label || 'Logo',
      url,
      kind,
      darkBgSafe: r.darkBgSafe === false ? false : true,
      lightBgSafe: r.lightBgSafe === false ? false : true,
      minSizePx: Math.max(8, Math.min(1024, Number(r.minSizePx ?? 64) || 64)),
      clearspacePx: Math.max(0, Math.min(256, Number(r.clearspacePx ?? 16) || 16)),
    })
    if (out.length >= 40) break
  }
  return out
}

export const DEFAULT_BRAND_PROFILE: BrandProfileV1 = {
  version: 1,
  brandName: '',
  tagline: '',
  audience: '',
  useBrandContextForAi: true,
  betaAcknowledged: false,
  toneTags: ['confident', 'minimal'],
  doSay: [],
  dontSay: [],
  bannedPhrases: [],
  socialHandles: {},
  palette: {
    primary: '#E2B84C',
    secondary: '#6D3EC4',
    accent: '#A85CFF',
    background: '#101014',
    text: '#F6F5F3',
  },
  typography: {
    heading: 'DM Sans',
    body: 'DM Sans',
    accent: 'Cinzel',
  },
  logos: [],
  watermarkDefaults: {
    enabled: true,
    placement: 'bottom-right',
    opacityPct: 70,
    scalePct: 16,
    marginPx: 20,
    traceRecipientPrefix: 'brand',
  },
  governance: {
    enforcementMode: 'warn',
    editorUserIds: [],
    approverUserIds: [],
  },
  notes: '',
}

export function sanitizeBrandProfile(input: Record<string, unknown>): BrandProfileV1 {
  const tones = sanitizeStringArray(input.toneTags, { maxItems: 8, maxLen: 40 }).filter(
    (v): v is BrandToneTag =>
      v === 'luxury' ||
      v === 'playful' ||
      v === 'mysterious' ||
      v === 'confident' ||
      v === 'romantic' ||
      v === 'minimal' ||
      v === 'bold' ||
      v === 'intimate',
  )
  const governanceRaw = input.governance && typeof input.governance === 'object'
    ? (input.governance as Record<string, unknown>)
    : {}
  const watermarkRaw = input.watermarkDefaults && typeof input.watermarkDefaults === 'object'
    ? (input.watermarkDefaults as Record<string, unknown>)
    : {}

  return {
    version: 1,
    brandName: clampStr(input.brandName, 120),
    tagline: clampStr(input.tagline, 180),
    audience: clampStr(input.audience, 220),
    useBrandContextForAi: input.useBrandContextForAi !== false,
    betaAcknowledged: Boolean(input.betaAcknowledged),
    toneTags: tones.length > 0 ? tones : DEFAULT_BRAND_PROFILE.toneTags,
    doSay: sanitizeStringArray(input.doSay, { maxItems: 60, maxLen: 160 }),
    dontSay: sanitizeStringArray(input.dontSay, { maxItems: 60, maxLen: 160 }),
    bannedPhrases: sanitizeStringArray(input.bannedPhrases, { maxItems: 80, maxLen: 120 }),
    socialHandles: sanitizeHandles(input.socialHandles),
    palette: {
      primary: normalizeHex((input.palette as Record<string, unknown> | undefined)?.primary, DEFAULT_BRAND_PROFILE.palette.primary),
      secondary: normalizeHex((input.palette as Record<string, unknown> | undefined)?.secondary, DEFAULT_BRAND_PROFILE.palette.secondary),
      accent: normalizeHex((input.palette as Record<string, unknown> | undefined)?.accent, DEFAULT_BRAND_PROFILE.palette.accent),
      background: normalizeHex((input.palette as Record<string, unknown> | undefined)?.background, DEFAULT_BRAND_PROFILE.palette.background),
      text: normalizeHex((input.palette as Record<string, unknown> | undefined)?.text, DEFAULT_BRAND_PROFILE.palette.text),
    },
    typography: {
      heading: clampStr((input.typography as Record<string, unknown> | undefined)?.heading, 80) || DEFAULT_BRAND_PROFILE.typography.heading,
      body: clampStr((input.typography as Record<string, unknown> | undefined)?.body, 80) || DEFAULT_BRAND_PROFILE.typography.body,
      accent: clampStr((input.typography as Record<string, unknown> | undefined)?.accent, 80) || DEFAULT_BRAND_PROFILE.typography.accent,
    },
    logos: sanitizeLogos(input.logos),
    watermarkDefaults: {
      enabled: watermarkRaw.enabled !== false,
      logoAssetId: clampStr(watermarkRaw.logoAssetId, 120) || undefined,
      placement:
        watermarkRaw.placement === 'top-left' ||
        watermarkRaw.placement === 'top-right' ||
        watermarkRaw.placement === 'bottom-left' ||
        watermarkRaw.placement === 'center'
          ? watermarkRaw.placement
          : 'bottom-right',
      opacityPct: Math.max(5, Math.min(100, Number(watermarkRaw.opacityPct ?? 70) || 70)),
      scalePct: Math.max(5, Math.min(80, Number(watermarkRaw.scalePct ?? 16) || 16)),
      marginPx: Math.max(0, Math.min(160, Number(watermarkRaw.marginPx ?? 20) || 20)),
      traceRecipientPrefix: clampStr(watermarkRaw.traceRecipientPrefix, 80) || 'brand',
    },
    governance: {
      enforcementMode:
        governanceRaw.enforcementMode === 'off' ||
        governanceRaw.enforcementMode === 'block'
          ? governanceRaw.enforcementMode
          : 'warn',
      editorUserIds: sanitizeStringArray(governanceRaw.editorUserIds, { maxItems: 100, maxLen: 64 }),
      approverUserIds: sanitizeStringArray(governanceRaw.approverUserIds, { maxItems: 100, maxLen: 64 }),
    },
    notes: clampStr(input.notes, 4000),
    updatedAt: new Date().toISOString(),
  }
}

export function parseBrandProfile(raw: unknown): BrandProfileV1 | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (r.version !== 1) return null
  return sanitizeBrandProfile(r)
}

export function toCompactBrandContext(profile: BrandProfileV1): string {
  const say = profile.doSay.slice(0, 12).join('; ')
  const avoid = [...profile.dontSay, ...profile.bannedPhrases].slice(0, 20).join('; ')
  const handles = Object.entries(profile.socialHandles)
    .slice(0, 6)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ')
  return [
    `Brand: ${profile.brandName || 'Creator Brand'}`,
    profile.tagline ? `Tagline: ${profile.tagline}` : '',
    profile.audience ? `Audience: ${profile.audience}` : '',
    `Tone: ${profile.toneTags.join(', ')}`,
    say ? `Preferred phrases: ${say}` : '',
    avoid ? `Avoid phrases: ${avoid}` : '',
    handles ? `Handles: ${handles}` : '',
    `Palette: primary ${profile.palette.primary}, secondary ${profile.palette.secondary}, accent ${profile.palette.accent}`,
    `Typography: heading ${profile.typography.heading}, body ${profile.typography.body}`,
  ]
    .filter(Boolean)
    .join('\n')
}

