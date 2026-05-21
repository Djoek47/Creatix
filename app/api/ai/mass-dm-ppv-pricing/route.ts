import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import {
  chargeAiToolCreditsAfterSuccess,
  requireAiToolSessionAndCredits,
} from '@/lib/ai/assert-ai-tool-access'

type FanPriceInput = {
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
  minPrice?: number
  maxPrice?: number
  targetTotalUsd?: number
  expectedBuyers?: number
  fans?: FanPriceInput[]
}

type PriceRow = {
  fanId: string
  price: number
  reason: string
}

function parseRows(raw: string): PriceRow[] {
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
        const price = Number(r.price ?? NaN)
        const reason = String(r.reason ?? '').trim()
        if (!fanId || !Number.isFinite(price)) return null
        return {
          fanId,
          price,
          reason: reason.slice(0, 220),
        } satisfies PriceRow
      })
      .filter((row): row is PriceRow => row != null)
  } catch {
    return []
  }
}

export async function POST(req: NextRequest) {
  const access = await requireAiToolSessionAndCredits(req, 'mass-dm-ppv-pricing')
  if (!access.ok) return access.response
  const { supabase, userId, cost, billingToolId } = access.data

  const body = (await req.json().catch(() => ({}))) as Body
  const minPrice = Math.max(1, Number(body.minPrice ?? 5) || 5)
  const maxPrice = Math.max(minPrice, Number(body.maxPrice ?? Math.max(15, minPrice * 3)) || Math.max(15, minPrice * 3))
  const targetTotalUsd = Number.isFinite(Number(body.targetTotalUsd)) ? Math.max(0, Number(body.targetTotalUsd)) : 0
  const expectedBuyers = Math.max(1, Math.floor(Number(body.expectedBuyers ?? 1) || 1))
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
      threadHint: String(f.threadHint ?? '').trim().slice(0, 280),
    }))
    .filter((f) => f.fanId)
    .slice(0, 200)

  if (fans.length === 0) return NextResponse.json({ error: 'Provide at least one fan' }, { status: 400 })

  const { data: fanRows } = await supabase
    .from('fans')
    .select('id,platform,platform_fan_id')
    .eq('user_id', userId)
    .in('id', fans.map((f) => f.fanId))
    .limit(500)
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
    const txt = String(row.thread_snapshot_text ?? '').trim().replace(/\s+/g, ' ').slice(0, 280)
    if (!pf || !txt) continue
    insightByPlatformFan.set(`${platform}:${pf}`, txt)
  }
  const enrichedFans = fans.map((fan) => {
    const mapping = lookup.get(fan.fanId)
    if (!mapping) return fan
    const threadHint = insightByPlatformFan.get(`${mapping.platform}:${mapping.platformFanId}`)
    return { ...fan, threadHint: threadHint || fan.threadHint }
  })

  const prompt = `You optimize PPV pricing per fan.
Return ONLY valid JSON array:
[
  { "fanId": "id", "price": 12.5, "reason": "short reason" }
]

Rules:
- One row per fan.
- Price in USD with max 2 decimals.
- Keep between minPrice and maxPrice.
- Use spend, status, and context hints.
- If targetTotalUsd > 0, bias aggregate prices so expectedBuyers * averagePrice is close to targetTotalUsd.

Inputs:
minPrice=${minPrice}
maxPrice=${maxPrice}
targetTotalUsd=${targetTotalUsd}
expectedBuyers=${expectedBuyers}
fans=${JSON.stringify(enrichedFans)}`

  const ai = await generateText({
    model: gateway('anthropic/claude-sonnet-4'),
    temperature: 0.2,
    maxOutputTokens: 2600,
    prompt,
  })

  const rows = parseRows(ai.text)
  const rowById = new Map(rows.map((r) => [r.fanId, r]))
  let suggestions = enrichedFans.map((fan) => {
    const row = rowById.get(fan.fanId)
    const fallbackBase = Math.max(minPrice, Math.min(maxPrice, minPrice + fan.totalSpent * 0.04))
    const rawPrice = row?.price ?? fallbackBase
    const bounded = Math.max(minPrice, Math.min(maxPrice, rawPrice))
    return {
      fanId: fan.fanId,
      price: Math.round(bounded * 100) / 100,
      reason: row?.reason || 'Price aligned to spend and campaign target.',
    }
  })

  if (targetTotalUsd > 0 && expectedBuyers > 0) {
    const currentExpected = suggestions.reduce((sum, s) => sum + s.price, 0)
    if (currentExpected > 0) {
      const targetAverage = targetTotalUsd / expectedBuyers
      const ratio = targetAverage / (currentExpected / suggestions.length)
      suggestions = suggestions.map((s) => {
        const adjusted = Math.max(minPrice, Math.min(maxPrice, s.price * ratio))
        return {
          ...s,
          price: Math.round(adjusted * 100) / 100,
        }
      })
    }
  }

  const charged = await chargeAiToolCreditsAfterSuccess(supabase, userId, cost, billingToolId)
  if (!charged.ok) return charged.response

  return NextResponse.json({
    suggestions,
    pricingSummary: {
      minPrice,
      maxPrice,
      targetTotalUsd,
      expectedBuyers,
      totalSuggested: suggestions.reduce((sum, s) => sum + s.price, 0),
    },
    creditsCharged: cost,
  })
}
