import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import type { PlatformStatusTone, SystemStatusResponse } from '@/lib/system-status-contract'

/**
 * Lightweight security/dashboard probe: Hosting + Circe alive + creator platform links + AI key presence.
 * Does not hit external creator APIs beyond Supabase reads.
 */
export async function GET(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: connections } = await supabase
    .from('platform_connections')
    .select('platform, is_connected')
    .eq('user_id', user.id)
    .in('platform', ['onlyfans', 'fansly'])

  const onlyFansConnected = (connections ?? []).some(
    (conn) => conn.platform === 'onlyfans' && conn.is_connected === true,
  )
  const fanslyConnected = (connections ?? []).some(
    (conn) => conn.platform === 'fansly' && conn.is_connected === true,
  )

  const hosting =
    Boolean(process.env.VERCEL || process.env.VERCEL_ENV) ?
      ({
        provider: 'vercel',
        environment: process.env.VERCEL_ENV ?? 'production',
        region: process.env.VERCEL_REGION ?? null,
      } as const)
    : ({
        provider: 'development',
        environment: process.env.NODE_ENV ?? 'development',
        region: null,
      } as const)

  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY?.trim())

  /** Vercel AI Gateway can run without OPENAI_* when wired via OIDC — still optimistic if deployed. */
  const aiOperational = hasOpenAi || (hosting.provider === 'vercel' && process.env.NODE_ENV !== 'development')

  const toneForAi: PlatformStatusTone = hasOpenAi ? 'up' : aiOperational ? 'idle' : 'degraded'

  const bodies: SystemStatusResponse = {
    generatedAt: new Date().toISOString(),
    hosting,
    services: [
      {
        id: 'vercel-edge',
        label: 'Vercel',
        tone: hosting.provider === 'vercel' ? 'up' : 'idle',
        detail:
          hosting.provider === 'vercel' ?
            [hosting.environment, hosting.region ?? 'multi-region'].filter(Boolean).join(' · ')
          : 'Local development',
      },
      {
        id: 'circe',
        label: 'Circe API',
        tone: 'up',
        detail: 'Responded OK',
      },
      {
        id: 'onlyfans-link',
        label: 'OnlyFans',
        tone: onlyFansConnected ? 'up' : 'idle',
        detail: onlyFansConnected ? 'Account linked' : 'Not connected',
      },
      {
        id: 'fansly-link',
        label: 'Fansly API',
        tone: fanslyConnected ? 'up' : 'idle',
        detail: fanslyConnected ? 'Account linked' : 'Not connected',
      },
      {
        id: 'ai-models',
        label: 'AI routing',
        tone: toneForAi === 'degraded' ? 'degraded' : toneForAi === 'idle' ? 'idle' : 'up',
        detail:
          hasOpenAi ?
            'Model key present'
          : hosting.provider === 'vercel' ?
            'Managed gateway (OAuth)'
          : undefined,
      },
    ],
  }

  return NextResponse.json(bodies as SystemStatusResponse)
}
