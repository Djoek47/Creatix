import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { parseBrandProfile, sanitizeBrandProfile } from '@/lib/brand/brand-profile-types'
import { renderBrandMarkdown } from '@/lib/brand/render-brand-markdown'

export async function POST(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { versionId?: string }
  if (!body.versionId) {
    return NextResponse.json({ error: 'Missing versionId' }, { status: 400 })
  }

  const { data: versionRow, error: versionErr } = await supabase
    .from('brand_profile_versions')
    .select('profile')
    .eq('id', body.versionId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (versionErr) return NextResponse.json({ error: versionErr.message }, { status: 500 })
  if (!versionRow) return NextResponse.json({ error: 'Version not found' }, { status: 404 })

  const profile = parseBrandProfile(versionRow.profile) ?? sanitizeBrandProfile(versionRow.profile as Record<string, unknown>)
  const markdown = renderBrandMarkdown(profile)

  const { data: currentRow } = await supabase
    .from('brand_profiles')
    .select('version')
    .eq('user_id', user.id)
    .maybeSingle()
  const nextVersion = Math.max(1, Number(currentRow?.version) || 0) + 1

  const { error: upsertErr } = await supabase.from('brand_profiles').upsert(
    {
      user_id: user.id,
      profile: profile as unknown as Record<string, unknown>,
      markdown,
      version: nextVersion,
      is_beta_acknowledged: Boolean(profile.betaAcknowledged),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

  await supabase.from('brand_profile_versions').insert({
    user_id: user.id,
    profile_version: nextVersion,
    profile: profile as unknown as Record<string, unknown>,
    markdown,
  })

  return NextResponse.json({ success: true, profile, markdown, version: nextVersion })
}

