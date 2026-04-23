import type { SupabaseClient } from '@supabase/supabase-js'
import {
  DEFAULT_BRAND_PROFILE,
  parseBrandProfile,
  toCompactBrandContext,
  type BrandProfileV1,
} from '@/lib/brand/brand-profile-types'

export type BrandContextPayload = {
  compact: string
  full: BrandProfileV1
  markdown: string
  version: number
}

export async function getBrandContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<BrandContextPayload | null> {
  const { data, error } = await supabase
    .from('brand_profiles')
    .select('profile, markdown, version')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null

  const parsed = parseBrandProfile(data.profile) || {
    ...DEFAULT_BRAND_PROFILE,
    brandName: 'Creator Brand',
  }

  if (!parsed.useBrandContextForAi) return null

  return {
    compact: toCompactBrandContext(parsed),
    full: parsed,
    markdown: typeof data.markdown === 'string' ? data.markdown : '',
    version: Number(data.version) || 1,
  }
}

