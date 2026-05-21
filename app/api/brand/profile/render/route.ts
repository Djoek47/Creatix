import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { parseBrandProfile, sanitizeBrandProfile } from '@/lib/brand/brand-profile-types'
import { renderBrandMarkdown } from '@/lib/brand/render-brand-markdown'

export async function GET(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('brand_profiles')
    .select('profile, version')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const profile = parseBrandProfile(data?.profile) ?? sanitizeBrandProfile({})
  const markdown = renderBrandMarkdown(profile)
  const version = Number(data?.version) || 1

  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="brand-uniformity-v${version}.md"`,
    },
  })
}

