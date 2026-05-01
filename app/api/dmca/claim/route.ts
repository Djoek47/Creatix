import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import {
  type DMCAClaimData,
  generateDMCANotice,
  insertDraftDmcaClaim,
} from '@/lib/dmca/create-draft-claim'
import { CREDITS_DMCA_CLAIM } from '@/lib/billing/credit-economics'
import { consumeAiCredits, hasEnoughAiCredits, insufficientAiCreditsResponse } from '@/lib/billing/consume-ai-credits'
import { formatAriadneAttributionForDmcaAppend } from '@/lib/dmca/ariadne-dmca-snippet'
import type { MarkitAttributionResult } from '@/lib/ariadne/attribution-types'

// POST: Generate a pre-filled DMCA claim
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const gate = await hasEnoughAiCredits(supabase, user.id, CREDITS_DMCA_CLAIM)
    if (!gate.ok) {
      return insufficientAiCreditsResponse(gate.used, gate.limit)
    }

    const body: Partial<DMCAClaimData> & { ariadneAttributionEvidence?: unknown } = await request.json()

    // Get user profile for pre-filling
    const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).single()

    // Get connected platform info for pre-filling
    const { data: connections } = await supabase
      .from('platform_connections')
      .select('platform, platform_username')
      .eq('user_id', user.id)
      .eq('is_connected', true)

    const baseDescription =
      body.contentDescription ||
      'Original adult content created exclusively for my subscribers on my official platform profile.'

    let contentDescription = baseDescription
    const ev = body.ariadneAttributionEvidence
    if (
      ev &&
      typeof ev === 'object' &&
      'is_markit' in ev &&
      typeof (ev as MarkitAttributionResult).is_markit === 'boolean' &&
      'detection_method' in ev &&
      typeof (ev as MarkitAttributionResult).confidence === 'number'
    ) {
      const a = ev as MarkitAttributionResult
      contentDescription =
        `${baseDescription.trim()}\n\n---\n` +
        formatAriadneAttributionForDmcaAppend(a)
    }

    // Build the pre-filled claim data
    const claimData: DMCAClaimData = {
      claimantName: body.claimantName || profile?.full_name || user.email?.split('@')[0] || '',
      claimantEmail: body.claimantEmail || profile?.email || user.email || '',
      claimantAddress: body.claimantAddress || '',
      claimantPhone: body.claimantPhone || '',
      copyrightOwner: body.copyrightOwner || connections?.[0]?.platform_username || profile?.full_name || '',
      infringingUrl: body.infringingUrl || '',
      originalContentUrl: body.originalContentUrl || '',
      contentDescription,
      platform: body.platform || connections?.[0]?.platform || 'onlyfans',
      platformUsername: body.platformUsername || connections?.[0]?.platform_username || '',
      leakAlertId: body.leakAlertId,
      proofPaths: Array.isArray(body.proofPaths) ? body.proofPaths.filter(Boolean) : [],
    }

    // If this is from a leak alert, get that data
    if (body.leakAlertId) {
      const { data: leakAlert } = await supabase
        .from('leak_alerts')
        .select('*')
        .eq('id', body.leakAlertId)
        .eq('user_id', user.id)
        .single()

      if (leakAlert) {
        const la = leakAlert as { source_url: string; source_platform?: string | null; platform?: string | null }
        claimData.infringingUrl = la.source_url
        claimData.platform = (la.source_platform || la.platform || claimData.platform) as string
      }
    }

    const dmcaNotice = generateDMCANotice(claimData)

    const { claimId: savedId, error: saveError } = await insertDraftDmcaClaim(supabase, user.id, claimData)

    if (saveError) {
      console.error('Failed to save DMCA claim:', saveError)
    }

    const consumed = await consumeAiCredits(supabase, user.id, CREDITS_DMCA_CLAIM, {
      reasonCode: 'dmca_claim',
      metadata: { service_display_name: 'DMCA claim draft' },
    })
    if (!consumed.ok) {
      return insufficientAiCreditsResponse(consumed.used, consumed.limit)
    }

    return NextResponse.json({
      success: true,
      claim: claimData,
      notice: dmcaNotice,
      claimId: savedId ?? undefined,
      connectedPlatforms:
        connections?.map((c) => ({
          platform: c.platform,
          username: c.platform_username,
        })) || [],
    })
  } catch (error) {
    console.error('DMCA claim error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate claim',
      },
      { status: 500 },
    )
  }
}

// GET: Get user's DMCA claims history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: claims } = await supabase
      .from('dmca_claims')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ claims: claims || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch claims' }, { status: 500 })
  }
}
