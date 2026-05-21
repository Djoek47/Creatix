import type { BrandProfileV1 } from '@/lib/brand/brand-profile-types'

export type BrandComplianceResult = {
  violations: string[]
  warnings: string[]
  blocked: boolean
}

export function evaluateBrandTextCompliance(profile: BrandProfileV1 | null, text: string): BrandComplianceResult {
  if (!profile) return { violations: [], warnings: [], blocked: false }
  const source = text.toLowerCase()
  const violations: string[] = []

  for (const phrase of profile.bannedPhrases) {
    const p = phrase.toLowerCase().trim()
    if (!p) continue
    if (source.includes(p)) violations.push(`Contains banned phrase: "${phrase}"`)
  }

  const warnings: string[] = []
  for (const phrase of profile.dontSay) {
    const p = phrase.toLowerCase().trim()
    if (!p) continue
    if (source.includes(p)) warnings.push(`Avoided phrase appears: "${phrase}"`)
  }

  const blocked = profile.governance.enforcementMode === 'block' && violations.length > 0

  return { violations, warnings, blocked }
}

