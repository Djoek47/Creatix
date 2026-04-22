import { generateText, Output } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import { withDefaultAccountIds } from '@/lib/onlyfans-api-route'
import { loadAdultPlatformBillingContext } from '@/lib/billing/onlyfans-billing-gate'
import { assessGoalRealism } from '@/lib/income-predictor/realism'
import { bucketPublishedPosts, countPostsInWindow } from '@/lib/income-predictor/calendar-buckets'
import { chargeAiToolCreditsAfterSuccess, requireAiToolSessionAndCredits } from '@/lib/ai/assert-ai-tool-access'

export const maxDuration = 60

const incomePredictorSchema = z.object({
  headline: z.string().describe('One-line takeaway for the creator'),
  summary: z.string().describe('2–4 sentences combining partner forecast context, cadence, and goal'),
  partnerForecastNarrative: z.string().describe('Explain what the statistical forecast implies, or say it is unavailable'),
  nextMonthTargetAssessment: z.string().describe('Comment on their goal using the realism assessment'),
  strategies: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
    }),
  ).max(8),
  leakAndProtection: z.string().describe('Leak alerts + protection habits; link mentally to Aegis / Protection'),
  postingCadenceAdvice: z.string().describe('Tie post rate and last post to next-month outcomes'),
})

export type IncomePredictorMode = 'maintain' | 'grow'
export type IncomePredictorCalendarMode = 'week' | 'month'

export async function POST(req: NextRequest) {
  const access = await requireAiToolSessionAndCredits(req, 'income-predictor')
  if (!access.ok) return access.response
  const { supabase, userId, cost: incomeCost } = access.data

  const body = (await req.json().catch(() => ({}))) as {
    calendarMode?: IncomePredictorCalendarMode
    goalUsd?: number | null
    mode?: IncomePredictorMode
  }
  const calendarMode: IncomePredictorCalendarMode = body.calendarMode === 'week' ? 'week' : 'month'
  const mode: IncomePredictorMode = body.mode === 'grow' ? 'grow' : 'maintain'
  const goalUsd =
    typeof body.goalUsd === 'number' && Number.isFinite(body.goalUsd) && body.goalUsd > 0 ? body.goalUsd : null

  const uid = userId

  const [billingCtx, leaksRes, contentRes, snapshotsRes] = await Promise.all([
    loadAdultPlatformBillingContext(supabase),
    supabase.from('leak_alerts').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('status', 'detected'),
    supabase
      .from('content')
      .select('id, title, published_at, status')
      .eq('user_id', uid)
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(400),
    supabase
      .from('analytics_snapshots')
      .select('date, platform, revenue')
      .eq('user_id', uid)
      .eq('platform', 'onlyfans')
      .order('date', { ascending: false })
      .limit(45),
  ])

  const openLeakAlerts = leaksRes.count ?? 0
  const rows = contentRes.data ?? []
  const publishedDates = rows
    .map((r) => (r as { published_at?: string | null }).published_at)
    .filter((s): s is string => typeof s === 'string' && s.length > 0)

  const last = rows[0] as { title?: string | null; published_at?: string | null } | undefined
  const lastPostPublishedAt = last?.published_at ?? null
  const lastPostTitle = typeof last?.title === 'string' ? last.title : null

  const postsLast30 = countPostsInWindow(publishedDates, 30)
  const postsLast28 = countPostsInWindow(publishedDates, 28)
  const postsPerWeekAvg = postsLast28 / 4
  const calendarBuckets = bucketPublishedPosts(publishedDates, calendarMode)

  const snapRows = (snapshotsRes.data ?? []) as Array<{ date?: string; revenue?: number }>
  let snapshotRevenue30 = 0
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  for (const s of snapRows) {
    const d = s.date ? new Date(s.date).getTime() : 0
    if (d >= cutoff && typeof s.revenue === 'number' && Number.isFinite(s.revenue)) {
      snapshotRevenue30 += s.revenue
    }
  }

  const onlyFansConnected = Boolean(billingCtx?.onlyfansAccessToken)
  const billingBlocked = Boolean(billingCtx?.denial)

  let partnerForecastRaw: unknown = null
  let partnerForecastError: string | null = null

  if (onlyFansConnected && billingCtx?.onlyfansAccessToken && !billingCtx.denial) {
    try {
      const api = createOnlyFansAPI()
      api.setAccountId(billingCtx.onlyfansAccessToken)
      const horizon_months = calendarMode === 'week' ? 1 : 3
      const payload = withDefaultAccountIds(
        {
          forecast_metric: 'revenue',
          horizon_months,
        },
        billingCtx.onlyfansAccessToken,
      )
      partnerForecastRaw = await api.analyticsRevenueForecast(payload)
    } catch (e) {
      partnerForecastError = e instanceof Error ? e.message : 'Partner forecast failed'
    }
  } else if (!onlyFansConnected) {
    partnerForecastError = 'OnlyFans not connected — connect under Settings → Integrations for partner forecast.'
  } else if (billingCtx?.denial) {
    partnerForecastError = billingCtx.denial.message
  }

  const currentMonthlyUsdEstimate =
    snapshotRevenue30 > 0
      ? snapshotRevenue30
      : snapRows.length > 0 && typeof snapRows[0].revenue === 'number'
        ? snapRows[0].revenue * 30
        : null

  const heuristics = assessGoalRealism({
    currentMonthlyUsd: currentMonthlyUsdEstimate,
    goalUsd: mode === 'grow' ? goalUsd : currentMonthlyUsdEstimate,
    mode,
  })

  const forecastSnippet =
    partnerForecastRaw != null
      ? JSON.stringify(partnerForecastRaw).slice(0, 8000)
      : '(no partner forecast)'

  const systemPrompt = `You are Circe’s income planning assistant for adult creators (OnlyFans-first).
Rules:
- Never invent dollar amounts not present in the user context or partner forecast JSON.
- If partner forecast is missing, say so clearly and rely on cadence, goals, and protection.
- Respect the realism assessment: if unrealistic, encourage intermediate milestones (revenue bands), not lottery outcomes.
- Mention open leak alerts when count > 0 and recommend reviewing Protection / Aegis.
- Be concise, actionable, and supportive.`

  const userContent = `Context (facts):
- onlyFansConnected: ${onlyFansConnected}
- partnerForecastError: ${partnerForecastError ?? 'none'}
- openLeakAlerts: ${openLeakAlerts}
- calendarMode: ${calendarMode}
- mode: ${mode}
- userGoalUsd (grow only): ${goalUsd ?? 'n/a'}
- lastPostPublishedAt: ${lastPostPublishedAt ?? 'none'}
- lastPostTitle: ${lastPostTitle ?? 'none'}
- postsLast30Days: ${postsLast30}
- avgPostsPerWeek (from last 28d / 4): ${postsPerWeekAvg.toFixed(2)}
- estimatedMonthlyRevenueFromSnapshots30d (USD, may be null): ${currentMonthlyUsdEstimate != null ? currentMonthlyUsdEstimate.toFixed(2) : 'null'}

Realism assessment (heuristic, must align with your copy):
- level: ${heuristics.level}
- message: ${heuristics.message}
- suggestedNextTierOrRange: ${heuristics.suggestedNextTierOrRange ?? 'none'}

Partner forecast JSON (may be empty):
${forecastSnippet}

Calendar buckets (${calendarMode}):
${JSON.stringify(calendarBuckets)}

Produce structured output.`

  const { output } = await generateText({
    model: 'openai/gpt-4o-mini',
    output: Output.object({ schema: incomePredictorSchema }),
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  })

  const charged = await chargeAiToolCreditsAfterSuccess(supabase, uid, incomeCost)
  if (!charged.ok) return charged.response

  return NextResponse.json({
    context: {
      currentMonthlyUsdEstimate,
      lastPostPublishedAt,
      lastPostTitle,
      postsPerWeekAvg,
      postsLast30Days: postsLast30,
      openLeakAlerts,
      onlyFansConnected,
      billingBlocked,
      partnerForecastError,
    },
    calendarMode,
    calendarBuckets,
    heuristics,
    partnerForecastRaw,
    ai: output,
  })
}
