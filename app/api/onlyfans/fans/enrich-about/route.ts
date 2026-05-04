import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { onlyFansBillingGateResponse } from '@/lib/onlyfans-api-route'
import { getFanRecentById } from '@/lib/divine/fan-recents-server'
import { consumeAiCredits, hasEnoughAiCredits, insufficientAiCreditsResponse } from '@/lib/billing/consume-ai-credits'
import { CREDITS_FAN_WEB_BIO_SERPER_AI } from '@/lib/billing/credit-economics'
import {
  analysisToCreatorDetector,
  analyzeSerperHitsForFanCreatorBio,
  collectFanWebSerperHits,
  formatSerperResultsForBioPrompt,
  mergeCreatorDetectorIntoFanThreadInsight,
} from '@/lib/divine/fan-web-bio-serper-ai'
import { SerperProvider } from '@/lib/leaks/search-providers'
import type { CreatorDetectorSignal } from '@/lib/divine/creator-detector'

export const maxDuration = 60

function isMissingFansColumnError(message: string): boolean {
  return /column .*fans\./i.test(message)
}

function creatorDetectorFromProfileJson(profileJson: unknown): Pick<CreatorDetectorSignal, 'is_creator_likely' | 'confidence'> | null {
  if (!profileJson || typeof profileJson !== 'object') return null
  const raw = (profileJson as Record<string, unknown>).creator_detector
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const isLikely = o.is_creator_likely === true
  const c = typeof o.confidence === 'number' && Number.isFinite(o.confidence) ? o.confidence : null
  if (c == null && !('is_creator_likely' in o)) return null
  return { is_creator_likely: isLikely, confidence: c ?? (isLikely ? 1 : 0) }
}

/**
 * POST { fanId: platform_fan_id, force?: boolean }
 * Serper web search + small LLM: classify fellow creator vs fan, extract a short public bio when evidence supports it.
 * Persists `fans.platform_about` (source `serper`) and merges `creator_detector` into `fan_thread_insights.profile_json`.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const billingBlock = await onlyFansBillingGateResponse(supabase)
    if (billingBlock) return billingBlock

    const body = (await req.json().catch(() => ({}))) as { fanId?: string; force?: boolean }
    const fanId = typeof body.fanId === 'string' ? body.fanId.trim() : ''
    if (!fanId) return NextResponse.json({ error: 'fanId required' }, { status: 400 })
    const force = body.force === true

    const { data: fanRow, error: fanErr } = await supabase
      .from('fans')
      .select('platform_about, platform_about_fetched_at, platform_about_source, platform_about_refreshed_at, platform_fan_id, username')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('platform_fan_id', fanId)
      .maybeSingle()

    if (fanErr) return NextResponse.json({ error: fanErr.message }, { status: 500 })

    let resolvedFanRow = fanRow as
      | {
          platform_about?: string | null
          platform_about_fetched_at?: string | null
          platform_about_refreshed_at?: string | null
          platform_about_source?: string | null
          platform_fan_id?: string
          username?: string | null
        }
      | null
    if (!resolvedFanRow) {
      const recent = await getFanRecentById(supabase, user.id, fanId, 'onlyfans')
      const safeFanKey = fanId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100)
      const username = (recent?.username?.trim() || `fan_${safeFanKey}`).slice(0, 200)
      const nowIso = new Date().toISOString()
      const insertPayload = {
        user_id: user.id,
        platform: 'onlyfans' as const,
        platform_fan_id: fanId,
        username,
        display_name: recent?.display_name?.slice(0, 200) ?? null,
        avatar_url: recent?.avatar_url ?? null,
        updated_at: nowIso,
      }
      const { error: insErr } = await supabase.from('fans').insert(insertPayload)
      if (insErr) {
        const isDup =
          insErr.code === '23505' ||
          /duplicate key|unique constraint/i.test(insErr.message ?? '')
        if (!isDup) return NextResponse.json({ error: insErr.message }, { status: 500 })
      }
      const { data: again, error: againErr } = await supabase
        .from('fans')
        .select('platform_about, platform_about_fetched_at, platform_about_source, platform_about_refreshed_at, platform_fan_id, username')
        .eq('user_id', user.id)
        .eq('platform', 'onlyfans')
        .eq('platform_fan_id', fanId)
        .maybeSingle()
      if (againErr) return NextResponse.json({ error: againErr.message }, { status: 500 })
      if (!again) {
        return NextResponse.json({ error: 'Fan not found in CRM' }, { status: 404 })
      }
      resolvedFanRow = again as {
        platform_about?: string | null
        platform_about_fetched_at?: string | null
        platform_about_refreshed_at?: string | null
        platform_about_source?: string | null
        platform_fan_id?: string
        username?: string | null
      }
    }

    const lastAt = resolvedFanRow.platform_about_fetched_at
    if (!force && lastAt) {
      const t = new Date(lastAt).getTime()
      if (!Number.isNaN(t) && Date.now() - t < 24 * 60 * 60 * 1000) {
        const { data: insRow } = await supabase
          .from('fan_thread_insights')
          .select('profile_json')
          .eq('user_id', user.id)
          .eq('platform', 'onlyfans')
          .eq('platform_fan_id', fanId)
          .maybeSingle()
        const pj = insRow != null ? (insRow as { profile_json?: unknown }).profile_json : null
        const det = creatorDetectorFromProfileJson(pj)
        return NextResponse.json({
          success: true,
          state: 'cached',
          source: resolvedFanRow.platform_about_source ?? 'none',
          about: resolvedFanRow.platform_about ?? null,
          reason: 'fetched_within_24h',
          likelyFellowCreator: det?.is_creator_likely ?? null,
          creatorConfidence: det?.confidence ?? null,
        })
      }
    }

    const serperKey = process.env.SERPER_API_KEY
    if (!serperKey) {
      return NextResponse.json(
        { error: 'Serper is not configured. Add SERPER_API_KEY to your environment, then redeploy.' },
        { status: 503 },
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI is not configured. Add OPENAI_API_KEY for web bio + creator classification.' },
        { status: 503 },
      )
    }

    const gate = await hasEnoughAiCredits(supabase, user.id, CREDITS_FAN_WEB_BIO_SERPER_AI)
    if (!gate.ok) return insufficientAiCreditsResponse(gate.used, gate.limit)

    const recent = await getFanRecentById(supabase, user.id, fanId, 'onlyfans')
    const username =
      typeof resolvedFanRow.username === 'string' && resolvedFanRow.username.trim()
        ? resolvedFanRow.username.trim()
        : (recent?.username?.trim() ?? '')
    const displayName = recent?.display_name?.trim() ?? null

    const provider = new SerperProvider(serperKey)
    const hits = await collectFanWebSerperHits(provider, {
      username,
      displayName,
      fanId,
    })

    if (hits.length === 0) {
      return NextResponse.json({
        success: true,
        state: 'not_found',
        source: 'none',
        about: null,
        aboutLength: 0,
        reason: 'no_serper_hits',
      })
    }

    const evidenceBlock = formatSerperResultsForBioPrompt(hits)
    const subjectLine = `platform_fan_id=${fanId}; username=${username || 'unknown'}; display_name=${displayName ?? '—'}`
    const analysis = await analyzeSerperHitsForFanCreatorBio(evidenceBlock, subjectLine)
    const detector = analysisToCreatorDetector(analysis)
    const aboutText =
      typeof analysis.creator_bio === 'string' && analysis.creator_bio.trim().length > 0
        ? analysis.creator_bio.trim().slice(0, 8000)
        : null

    const debit = await consumeAiCredits(supabase, user.id, CREDITS_FAN_WEB_BIO_SERPER_AI, {
      reasonCode: 'fan_web_bio_serper_ai',
      reasonRef: fanId,
      metadata: { fanId, username, tool: 'fan-web-bio-serper-ai' },
    })
    if (!debit.ok) return insufficientAiCreditsResponse(debit.used, debit.limit)

    const now = new Date().toISOString()
    const source: 'serper' | 'none' =
      aboutText != null || detector.is_creator_likely ? 'serper' : 'none'

    let { error: upErr } = await supabase
      .from('fans')
      .update({
        platform_about: aboutText,
        platform_about_fetched_at: now,
        platform_about_source: source === 'none' ? null : source,
        platform_about_refreshed_at: now,
        updated_at: now,
      })
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('platform_fan_id', fanId)

    if (upErr && isMissingFansColumnError(upErr.message ?? '')) {
      ;({ error: upErr } = await supabase
        .from('fans')
        .update({
          platform_about: aboutText,
          platform_about_fetched_at: now,
          updated_at: now,
        })
        .eq('user_id', user.id)
        .eq('platform', 'onlyfans')
        .eq('platform_fan_id', fanId))
    }

    if (upErr) {
      if (upErr.message.includes('platform_about')) {
        return NextResponse.json(
          { error: 'Database missing platform_about column. Run migration 048_fans_platform_about_crm.sql.' },
          { status: 503 },
        )
      }
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    const merged = await mergeCreatorDetectorIntoFanThreadInsight(supabase, user.id, 'onlyfans', fanId, detector)
    if (!merged.ok) {
      console.warn('[enrich-about] fan_thread_insights merge failed:', merged.error)
    }

    return NextResponse.json({
      success: true,
      state: 'serper_ai_used',
      source,
      about: aboutText,
      aboutLength: aboutText?.length ?? 0,
      likelyFellowCreator: detector.is_creator_likely,
      creatorConfidence: detector.confidence,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Enrich failed' },
      { status: 500 },
    )
  }
}
