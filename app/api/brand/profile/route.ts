import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import {
  DEFAULT_BRAND_PROFILE,
  parseBrandProfile,
  sanitizeBrandProfile,
} from '@/lib/brand/brand-profile-types'
import { renderBrandMarkdown } from '@/lib/brand/render-brand-markdown'

export async function GET(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('brand_profiles')
    .select('profile, markdown, version, is_beta_acknowledged, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!data) {
    const seed = {
      ...DEFAULT_BRAND_PROFILE,
      brandName: 'My Brand',
      updatedAt: new Date().toISOString(),
    }
    return NextResponse.json({
      profile: seed,
      markdown: renderBrandMarkdown(seed),
      version: 1,
      is_beta_acknowledged: false,
    })
  }

  const profile = parseBrandProfile(data.profile) ?? DEFAULT_BRAND_PROFILE
  return NextResponse.json({
    profile,
    markdown: typeof data.markdown === 'string' ? data.markdown : renderBrandMarkdown(profile),
    version: Number(data.version) || 1,
    is_beta_acknowledged: Boolean(data.is_beta_acknowledged),
    updated_at: data.updated_at,
  })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const profile = sanitizeBrandProfile(body)
  const markdown = renderBrandMarkdown(profile)

  const { data: currentRow } = await supabase
    .from('brand_profiles')
    .select('version')
    .eq('user_id', user.id)
    .maybeSingle()

  const nextVersion = Math.max(1, Number(currentRow?.version) || 0) + 1

  const upsertPayload = {
    user_id: user.id,
    profile: profile as unknown as Record<string, unknown>,
    markdown,
    version: nextVersion,
    is_beta_acknowledged: Boolean(profile.betaAcknowledged),
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('brand_profiles').upsert(upsertPayload, { onConflict: 'user_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('brand_profile_versions').insert({
    user_id: user.id,
    profile_version: nextVersion,
    profile: profile as unknown as Record<string, unknown>,
    markdown,
  })

  return NextResponse.json({
    success: true,
    profile,
    markdown,
    version: nextVersion,
  })
}

