import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import {
  chargeAiToolCreditsAfterSuccess,
  requireAiToolSessionAndCredits,
} from '@/lib/ai/assert-ai-tool-access'

type FanCaptionInput = {
  fanId: string
  platform: 'onlyfans' | 'fansly'
  username?: string
  displayName?: string | null
  totalSpent?: number
  creatorClassification?: string | null
  subscriptionTier?: string | null
  subscriptionStatus?: string | null
  threadHint?: string
}

type Body = {
  campaignBrief?: string
  tone?: string
  callToAction?: string
  fans?: FanCaptionInput[]
}

type FanCaptionSuggestion = {
  fanId: string
  caption: string
  reason: string
}

function parseRows(raw: string): FanCaptionSuggestion[] {
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
        const caption = String(r.caption ?? '').trim()
        const reason = String(r.reason ?? '').trim()
        if (!fanId || !caption) return null
        return {
          fanId,
          caption: caption.slice(0, 1800),
          reason: reason.slice(0, 220),
        } satisfies FanCaptionSuggestion
      })
      .filter((row): row is FanCaptionSuggestion => row != null)
  } catch {
    return []
  }
}

export async function POST(req: NextRequest) {
  const access = await requireAiToolSessionAndCredits(req, 'mass-dm-fan-captions')
  if (!access.ok) return access.response
  const { supabase, userId, cost } = access.data

  const body = (await req.json().catch(() => ({}))) as Body
  const campaignBrief = typeof body.campaignBrief === 'string' ? body.campaignBrief.trim().slice(0, 2000) : ''
  const tone = typeof body.tone === 'string' ? body.tone.trim().slice(0, 120) : 'Confident, personal, warm'
  const callToAction = typeof body.callToAction === 'string' ? body.callToAction.trim().slice(0, 240) : 'Reply now'
  const fans = (Array.isArray(body.fans) ? body.fans : [])
    .map((f) => ({
      fanId: String(f.fanId ?? '').trim(),
      platform: f.platform === 'fansly' ? 'fansly' : 'onlyfans',
      username: String(f.username ?? '').trim(),
      displayName: f.displayName ? String(f.displayName).trim() : null,
      totalSpent: Number(f.totalSpent ?? 0) || 0,
      creatorClassification: f.creatorClassification ? String(f.creatorClassification).trim() : null,
      subscriptionTier: f.subscriptionTier ? String(f.subscriptionTier).trim() : null,
      subscriptionStatus: f.subscriptionStatus ? String(f.subscriptionStatus).trim() : null,
      threadHint: String(f.threadHint ?? '').trim().slice(0, 320),
    }))
    .filter((f) => f.fanId)
    .slice(0, 120)

  if (fans.length === 0) {
    return NextResponse.json({ error: 'Provide at least one fan' }, { status: 400 })
  }

  const { data: fanRows } = await supabase
    .from('fans')
    .select('id,platform,platform_fan_id')
    .eq('user_id', userId)
    .in('id', fans.map((f) => f.fanId))
    .limit(400)
  const lookup = new Map<string, { platform: 'onlyfans' | 'fansly'; platformFanId: string }>()
  for (const row of (fanRows ?? []) as Record<string, unknown>[]) {
    const id = String(row.id ?? '').trim()
    const platform = row.platform === 'fansly' ? 'fansly' : row.platform === 'onlyfans' ? 'onlyfans' : null
    if (!id || !platform) continue
    const platformFanId = String(row.platform_fan_id ?? '').trim() || id
    lookup.set(id, { platform, platformFanId })
  }
  const insightIds = Array.from(lookup.values()).map((v) => v.platformFanId)
  const { data: insights } = await supabase
    .from('fan_thread_insights')
    .select('platform,platform_fan_id,thread_snapshot_text')
    .eq('user_id', userId)
    .in('platform', ['onlyfans', 'fansly'])
    .in('platform_fan_id', insightIds)
    .limit(500)
  const insightByPlatformFan = new Map<string, string>()
  for (const row of (insights ?? []) as Record<string, unknown>[]) {
    const platform = row.platform === 'fansly' ? 'fansly' : row.platform === 'onlyfans' ? 'onlyfans' : null
    if (!platform) continue
    const pf = String(row.platform_fan_id ?? '').trim()
    const txt = String(row.thread_snapshot_text ?? '').trim().replace(/\s+/g, ' ').slice(0, 320)
    if (!pf || !txt) continue
    insightByPlatformFan.set(`${platform}:${pf}`, txt)
  }

  const enrichedFans = fans.map((fan) => {
    const mapping = lookup.get(fan.fanId)
    if (!mapping) return fan
    const threadHint = insightByPlatformFan.get(`${mapping.platform}:${mapping.platformFanId}`)
    return { ...fan, threadHint: threadHint || fan.threadHint }
  })

  const prompt = `You write high-converting PPV or engagement DM lines for creators.
Return ONLY valid JSON array with this exact shape:
[
  { "fanId": "id", "caption": "message text", "reason": "why this angle fits this fan" }
]

Rules:
- One row per fan in input.
- Caption must feel personal and specific, not generic spam.
- Avoid explicit prohibited language or unsafe claims.
- Keep each caption under 500 characters.
- Include a clear CTA.

Campaign brief:
${campaignBrief || 'General campaign'}
Tone: ${tone}
CTA: ${callToAction}

Fans JSON:
${JSON.stringify(enrichedFans)}`

  const ai = await generateText({
    model: gateway('anthropic/claude-sonnet-4'),
    temperature: 0.35,
    maxOutputTokens: 3200,
    prompt,
  })

  const rows = parseRows(ai.text)
  const byFanId = new Map(rows.map((r) => [r.fanId, r]))
  const suggestions = enrichedFans.map((fan) => {
    const found = byFanId.get(fan.fanId)
    return {
      fanId: fan.fanId,
      caption:
        found?.caption ||
        `Hey ${fan.displayName || fan.username || 'you'}, I made something I think you'll really enjoy. ${callToAction}.`,
      reason: found?.reason || 'Fallback caption generated because structured output was partial.',
    }
  })

  const charged = await chargeAiToolCreditsAfterSuccess(supabase, userId, cost)
  if (!charged.ok) return charged.response

  return NextResponse.json({ suggestions, creditsCharged: cost })
}
