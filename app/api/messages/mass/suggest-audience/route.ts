import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import {
  requireAiToolSessionAndCredits,
  chargeAiToolCreditsAfterSuccess,
} from '@/lib/ai/assert-ai-tool-access'

type SuggestAudienceBody = {
  goal?: string
  platform?: 'all' | 'onlyfans' | 'fansly'
  targetRevenueUsd?: number
  maxFans?: number
}

type FanCandidate = {
  id: string
  platform: 'onlyfans' | 'fansly'
  platformFanId: string
  username: string
  displayName: string | null
  totalSpent: number
  creatorClassification: string | null
  subscriptionTier: string | null
  subscriptionStatus: string | null
  tags: string[]
  lastInteraction: string | null
  threadHint?: string
}

type SuggestionRow = {
  fanId: string
  platform: 'onlyfans' | 'fansly'
  score: number
  reason: string
}

function safeJsonParseArray(raw: string): SuggestionRow[] {
  const block = raw.match(/\[[\s\S]*\]/)?.[0]
  if (!block) return []
  try {
    const parsed = JSON.parse(block) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((row) => {
        if (!row || typeof row !== 'object') return null
        const r = row as Record<string, unknown>
        const fanId = String(r.fanId ?? '').trim()
        const platform = r.platform === 'fansly' ? 'fansly' : r.platform === 'onlyfans' ? 'onlyfans' : null
        const reason = String(r.reason ?? '').trim()
        const score = Number(r.score ?? 0)
        if (!fanId || !platform || !reason) return null
        return {
          fanId,
          platform,
          reason: reason.slice(0, 280),
          score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 50,
        } satisfies SuggestionRow
      })
      .filter((row): row is SuggestionRow => row != null)
  } catch {
    return []
  }
}

export async function POST(req: NextRequest) {
  const access = await requireAiToolSessionAndCredits(req, 'mass-dm-audience-suggester')
  if (!access.ok) return access.response
  const { supabase, userId, cost, billingToolId } = access.data

  const body = (await req.json().catch(() => ({}))) as SuggestAudienceBody
  const goal = typeof body.goal === 'string' ? body.goal.trim().slice(0, 800) : ''
  const platform = body.platform === 'onlyfans' || body.platform === 'fansly' ? body.platform : 'all'
  const maxFans = Math.min(200, Math.max(6, Math.floor(Number(body.maxFans ?? 20) || 20)))
  const targetRevenueUsd =
    Number.isFinite(Number(body.targetRevenueUsd)) && Number(body.targetRevenueUsd) > 0
      ? Number(body.targetRevenueUsd)
      : null

  let fansQuery = supabase
    .from('fans')
    .select(
      'id, platform, platform_fan_id, platform_username, display_name, total_spent, creator_classification, subscription_tier, subscription_status, tags, last_interaction',
    )
    .eq('user_id', userId)
    .in('platform', ['onlyfans', 'fansly'])
    .order('total_spent', { ascending: false })
    .limit(1500)

  if (platform !== 'all') fansQuery = fansQuery.eq('platform', platform)
  const { data: fanRows, error: fanErr } = await fansQuery
  if (fanErr) return NextResponse.json({ error: fanErr.message }, { status: 500 })

  const fans = ((fanRows ?? []) as Record<string, unknown>[])
    .map((row) => {
      const platformValue = row.platform === 'fansly' ? 'fansly' : row.platform === 'onlyfans' ? 'onlyfans' : null
      if (!platformValue) return null
      const id = String(row.id ?? '').trim()
      if (!id) return null
      const platformFanIdRaw = String(row.platform_fan_id ?? '').trim()
      return {
        id,
        platform: platformValue,
        platformFanId: platformFanIdRaw || id,
        username: String(row.platform_username ?? '').trim(),
        displayName: row.display_name ? String(row.display_name) : null,
        totalSpent: Number(row.total_spent ?? 0) || 0,
        creatorClassification: row.creator_classification ? String(row.creator_classification) : null,
        subscriptionTier: row.subscription_tier ? String(row.subscription_tier) : null,
        subscriptionStatus: row.subscription_status ? String(row.subscription_status) : null,
        tags: Array.isArray(row.tags) ? row.tags.map((t) => String(t)).slice(0, 8) : [],
        lastInteraction: row.last_interaction ? String(row.last_interaction) : null,
      } satisfies FanCandidate
    })
    .filter((row): row is FanCandidate => row != null)

  if (fans.length === 0) {
    return NextResponse.json({ suggestions: [] as SuggestionRow[], totalCandidates: 0 })
  }

  const fanByPlatformId = new Map<string, FanCandidate>()
  for (const fan of fans) {
    fanByPlatformId.set(`${fan.platform}:${fan.platformFanId}`, fan)
  }

  const platformFanIds = fans.map((f) => f.platformFanId).filter(Boolean)
  const { data: insights } = await supabase
    .from('fan_thread_insights')
    .select('platform, platform_fan_id, thread_snapshot_text')
    .eq('user_id', userId)
    .in('platform', platform === 'all' ? ['onlyfans', 'fansly'] : [platform])
    .in('platform_fan_id', platformFanIds)
    .limit(1200)

  for (const row of (insights ?? []) as Record<string, unknown>[]) {
    const p = row.platform === 'fansly' ? 'fansly' : row.platform === 'onlyfans' ? 'onlyfans' : null
    if (!p) continue
    const id = String(row.platform_fan_id ?? '').trim()
    if (!id) continue
    const key = `${p}:${id}`
    const fan = fanByPlatformId.get(key)
    if (!fan) continue
    const snapshot = String(row.thread_snapshot_text ?? '').trim()
    if (snapshot) fan.threadHint = snapshot.replace(/\s+/g, ' ').slice(0, 220)
  }

  const candidateSample = fans
    .slice(0, 300)
    .map((f) => ({
      fanId: f.id,
      platform: f.platform,
      platformFanId: f.platformFanId,
      username: f.username,
      displayName: f.displayName,
      totalSpent: f.totalSpent,
      creatorClassification: f.creatorClassification,
      subscriptionTier: f.subscriptionTier,
      subscriptionStatus: f.subscriptionStatus,
      lastInteraction: f.lastInteraction,
      tags: f.tags,
      threadHint: f.threadHint ?? '',
    }))

  const prompt = `You are an elite OnlyFans/Fansly revenue strategist.
Pick the best audience for a targeted DM campaign.

Return ONLY valid JSON array, no markdown:
[
  { "fanId": "uuid", "platform": "onlyfans|fansly", "score": 0-100, "reason": "short reason" }
]

Constraints:
- Pick up to ${maxFans} fans.
- Prefer users with strong conversion potential OR high retention risk depending on goal.
- Balance likely buyers and high-LTV retention.
- Use threadHint, spend, tags, subscription status, and profile labels.
- Keep reason concise and specific.

Goal: ${goal || 'General revenue and engagement lift'}
TargetRevenueUsd: ${targetRevenueUsd ?? 'none'}
Platform scope: ${platform}

Candidates JSON:
${JSON.stringify(candidateSample)}`

  const ai = await generateText({
    model: gateway('openai/gpt-4o-mini'),
    temperature: 0.25,
    maxOutputTokens: 1800,
    prompt,
  })

  const suggestionsRaw = safeJsonParseArray(ai.text)
  const seen = new Set<string>()
  const suggestions = suggestionsRaw
    .filter((row) => {
      const fan = fans.find((f) => f.id === row.fanId && f.platform === row.platform)
      if (!fan) return false
      const key = `${row.platform}:${row.fanId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, maxFans)

  const charged = await chargeAiToolCreditsAfterSuccess(supabase, userId, cost, billingToolId)
  if (!charged.ok) return charged.response

  return NextResponse.json({
    suggestions,
    totalCandidates: fans.length,
    creditsCharged: cost,
  })
}
