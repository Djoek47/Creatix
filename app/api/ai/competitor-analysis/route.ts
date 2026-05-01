import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { z } from 'zod'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import {
  chargeAiToolCreditsAfterSuccess,
  requireAiToolSessionAndCredits,
} from '@/lib/ai/assert-ai-tool-access'
import { isPaidSubscription } from '@/lib/billing/access'
import {
  runCompetitorDiscoverySearch,
  hitsToPromptBlock,
  type DiscoveryHit,
} from '@/lib/competitor-intelligence/discovery-search'

export const maxDuration = 120

const categoryEnum = z.enum([
  'chatting',
  'commenting',
  'dm_sales',
  'content_calendar',
  'pricing',
  'retention',
  'cross_platform',
  'growth',
  'other',
])

const outputSchema = z.object({
  executiveSummary: z
    .string()
    .describe(
      '2–4 short paragraphs: lead with you vs named competitors — same anonymized CRM fan band first, then one tier above (next quartile up). State evidence limits clearly.',
    ),
  marketContext: z.string().describe('How niche + platform typically compete; no fake statistics'),
  qualitativeTierNote: z
    .string()
    .describe(
      'Where the creator sits vs cohort quartiles (imported fans) and how that frames same-band vs one-tier-up competitors — qualitative only.',
    ),
  peerArchetypes: z
    .array(
      z.object({
        label: z
          .string()
          .describe('Name the band, e.g. "Same band (p25–p50 peers)" or "One tier above (p50–p75)" when applicable.'),
        typicalPublicSignals: z.string(),
        ideasToBorrow: z.string(),
      }),
    )
    .max(6),
  differentiationAngles: z.array(z.string()).max(10),
  postingCadenceIdeas: z.array(z.string()).max(6),
  chattingAndDmTips: z.array(z.string()).max(8),
  commentingAndSocialTips: z.array(z.string()).max(8),
  improvementPriorities: z
    .array(z.string())
    .max(8)
    .describe(
      '3–7 prioritized, concrete next steps (growth, retention, positioning) tailored to this creator. No URLs or "verify online" boilerplate.',
    ),
  caveats: z.string().describe('Ethics: public info only, no harassment, estimates not guarantees'),
})

type AnalysisOut = z.infer<typeof outputSchema>

type LibraryRow = {
  id: string
  category: string
  headline: string
  summary: string | null
  body: string
}

function libraryToPromptBlock(rows: LibraryRow[]): string {
  if (rows.length === 0) return '(No shared library rows yet — product may still be compiling best practices.)'
  return rows
    .map(
      (r) =>
        `## [${r.category}] ${r.headline}\n${r.summary ? `${r.summary}\n` : ''}${r.body.slice(0, 1200)}${r.body.length > 1200 ? '…' : ''}`,
    )
    .join('\n\n---\n\n')
}

function tipsToAnonymizedDigest(
  tips: { title: string; body: string }[],
  maxTips: number,
  maxCharsPerTip: number,
): string {
  if (tips.length === 0) return '(No approved community tips in feed yet.)'
  return tips
    .slice(0, maxTips)
    .map((t, i) => {
      const body = t.body.length > maxCharsPerTip ? `${t.body.slice(0, maxCharsPerTip)}…` : t.body
      return `Tip ${i + 1}: ${t.title}\n${body}`
    })
    .join('\n\n---\n\n')
}

type InternalBenchmarkRow = {
  platform: string
  niche_bucket: string
  creator_count: number
  fan_count_p25: number | null
  fan_count_p50: number | null
  fan_count_p75: number | null
  fan_count_mean: number | null
  dataset_creator_total: number
  computed_at: string
}

function platformKeysForBenchmarks(platform: 'onlyfans' | 'fansly'): string[] {
  return [platform, 'all']
}

function scoreBenchmarkNicheMatch(row: InternalBenchmarkRow, niche: string): number {
  if (!niche.trim()) return row.niche_bucket === 'unspecified' ? 2 : 1
  const n = niche.toLowerCase()
  const b = row.niche_bucket.toLowerCase()
  if (b === 'unspecified') return 1
  const first = n.split(/\s+/)[0] || ''
  if (b.includes(n) || n.includes(b) || (first && b.includes(first))) return 4
  return 0
}

function selectBenchmarksForPrompt(rows: InternalBenchmarkRow[], niche: string, limit: number): InternalBenchmarkRow[] {
  const scored = rows.map((r) => ({
    r,
    s: scoreBenchmarkNicheMatch(r, niche) * 10000 + r.creator_count,
  }))
  scored.sort((a, b) => b.s - a.s)
  return scored.slice(0, limit).map((x) => x.r)
}

function internalBenchmarksToPromptBlock(rows: InternalBenchmarkRow[]): string {
  if (rows.length === 0) {
    return '(No internal cohort benchmarks published yet — needs enough Creatix creators with imported fans, or wait for the weekly aggregate cron.)'
  }
  const total = rows[0]?.dataset_creator_total ?? 0
  const header = `These are anonymized percentiles from **Creatix creators who have fan rows in CRM** (imported subscribers), not public social follower counts. Dataset size (distinct creators): ${total}. Buckets combine platform_connections niches (first tag) when set.\n\n`
  const lines = rows.map((r) => {
    return (
      `- **${r.platform}** / niche bucket \`${r.niche_bucket}\`: ${r.creator_count} creators in bucket · ` +
      `imported fans p25=${r.fan_count_p25 ?? '—'} p50=${r.fan_count_p50 ?? '—'} p75=${r.fan_count_p75 ?? '—'} · mean≈${r.fan_count_mean ?? '—'} ` +
      `(computed ${r.computed_at?.slice(0, 10) ?? '—'})`
    )
  })
  return header + lines.join('\n')
}

/** Grounded copy for the UI: compares CRM fan count to the best-matching cohort bucket (not an exact rank). */
function buildCohortPercentileSummary(
  fanCount: number | null | undefined,
  rows: InternalBenchmarkRow[],
): string {
  if (rows.length === 0) {
    return (
      'Anonymized Creatix cohort benchmarks are not available yet. Once enough creators have imported fans into CRM, ' +
      'you will see how your imported fan count lines up with peer quartiles (p25 / median / p75) by niche and platform.'
    )
  }
  const row = rows[0]
  const total = row.dataset_creator_total
  const bucketN = row.creator_count
  const label = `${row.platform} / ${row.niche_bucket}`

  if (fanCount == null) {
    return (
      'We do not have your imported fan count in CRM yet. Connect or import fans to compare against anonymized peers ' +
      `in the ${label} bucket (${bucketN} creators in this bucket; ${total} creators total in the anonymized dataset).`
    )
  }

  const p25 = row.fan_count_p25
  const p50 = row.fan_count_p50
  const p75 = row.fan_count_p75
  const mean = row.fan_count_mean

  let band: string
  if (p25 != null && p50 != null && p75 != null) {
    if (fanCount < p25) {
      band =
        'roughly below the lower quartile (below p25): fewer imported fans than about three-quarters of peers in this bucket'
    } else if (fanCount < p50) {
      band = 'roughly between the lower quartile and the median (p25–p50)'
    } else if (fanCount < p75) {
      band = 'roughly between the median and upper quartile (p50–p75)'
    } else {
      band = 'roughly in the upper quartile (above p75) compared with peers in this bucket'
    }
  } else if (p50 != null) {
    if (fanCount < p50) band = 'roughly below the cohort median for imported fans in this bucket'
    else if (fanCount > p50) band = 'roughly above the cohort median for imported fans in this bucket'
    else band = 'close to the cohort median for imported fans in this bucket'
  } else if (mean != null) {
    if (fanCount < mean) band = 'roughly below the cohort mean for imported fans in this bucket'
    else if (fanCount > mean) band = 'roughly above the cohort mean for imported fans in this bucket'
    else band = 'close to the cohort mean for imported fans in this bucket'
  } else {
    band = 'quartile cutoffs are not available for this bucket yet — use your count as loose context only'
  }

  return (
    `Your imported fans in CRM: ${fanCount.toLocaleString()}. ` +
      `Compared with anonymized Creatix peers in ${label} (${bucketN} creators in this bucket; ${total} creators in the full dataset): ` +
      `p25=${p25 ?? '—'} · median (p50)=${p50 ?? '—'} · p75=${p75 ?? '—'} (imported CRM rows, not public followers). ` +
      `That places you ${band}. This is an approximate band versus peers in this bucket, not an exact percentile rank.`
  )
}

/** Frames “same stat band” vs “one tier above” for competitor comparison (next quartile band). */
function buildTierBandGuide(
  fanCount: number | null | undefined,
  rows: InternalBenchmarkRow[],
): string {
  if (rows.length === 0) {
    return (
      '**Tier framing:** No cohort row matched — compare competitors **qualitatively** from creator-supplied public cues. ' +
      'When benchmarks appear, interpret “same band” as peers in a similar imported-fan range and “one tier above” as the next quartile up.'
    )
  }
  const row = rows[0]
  const p25 = row.fan_count_p25
  const p50 = row.fan_count_p50
  const p75 = row.fan_count_p75
  const label = `${row.platform} / ${row.niche_bucket}`

  if (fanCount == null || p25 == null || p50 == null || p75 == null) {
    return (
      `**Tier framing (${label}):** Quartile cutoffs (imported CRM fans in cohort): p25=${p25 ?? '—'} · p50=${p50 ?? '—'} · p75=${p75 ?? '—'}. ` +
      'Without the creator’s exact imported fan count, infer **same band** vs **one tier above** from their notes and named competitors only — do not invent metrics.'
    )
  }

  type Band = 'below_p25' | 'p25_p50' | 'p50_p75' | 'above_p75'
  let band: Band
  if (fanCount < p25) band = 'below_p25'
  else if (fanCount < p50) band = 'p25_p50'
  else if (fanCount < p75) band = 'p50_p75'
  else band = 'above_p75'

  const sameBand: Record<Band, string> = {
    below_p25:
      '**Your band:** below p25 (lower quartile for imported fans in this bucket). **Same-band competitors:** treat named peers who plausibly sit in a similar lower-quartile range like you.',
    p25_p50:
      '**Your band:** between p25 and p50 (below cohort median). **Same-band competitors:** peers who look comparable in scale/positioning to you in this range.',
    p50_p75:
      '**Your band:** between p50 and p75 (above median, below top quartile). **Same-band competitors:** peers who sit with you in this upper-middle band.',
    above_p75:
      '**Your band:** above p75 (top quartile for imported fans in this bucket). **Same-band competitors:** peers at a similar top-quartile level.',
  }

  const tierAbove: Record<Band, string> = {
    below_p25:
      '**One tier above:** roughly **p25–p50** (up to the cohort median). Contrast what competitors in that next band typically do vs your named peers in your band.',
    p25_p50:
      '**One tier above:** roughly **p50–p75** (between median and upper quartile). Focus on what separates that tier from your band.',
    p50_p75:
      '**One tier above:** roughly **above p75** (top quartile). Describe what stronger peers in that tier tend to do publicly.',
    above_p75:
      '**One tier above:** there is no higher quartile in this cohort slice — use **aspirational next step** language (growth plays from web + library) without inventing follower counts.',
  }

  return `${sameBand[band]}\n\n${tierAbove[band]}`
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan_id, status')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!isPaidSubscription(sub)) {
      return NextResponse.json({ error: 'Competitor insights require an active Pro plan.' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const niche = typeof body.niche === 'string' ? body.niche.trim() : ''
    const rawPlat = typeof body.platform === 'string' ? body.platform.trim().toLowerCase() : 'onlyfans'
    const platform: 'onlyfans' | 'fansly' = rawPlat === 'fansly' ? 'fansly' : 'onlyfans'
    const competitorTargets =
      typeof body.competitorTargets === 'string' ? body.competitorTargets.trim() : ''
    const goals = typeof body.goals === 'string' ? body.goals.trim() : typeof body.contentDescription === 'string' ? body.contentDescription.trim() : ''
    const useWebSearch = body.useWebSearch !== false

    if (!niche && !competitorTargets && !goals) {
      return NextResponse.json(
        { error: 'Add your niche, competitor notes, or goals so we can tailor the analysis.' },
        { status: 400 },
      )
    }

    const access = await requireAiToolSessionAndCredits(req, 'competitor-analysis')
    if (!access.ok) return access.response
    const creditCost = access.data.cost

    const benchPlatforms = [...new Set(platformKeysForBenchmarks(platform))]

    const [{ data: profile }, { count: fanCount }, { data: libRows }, { data: tips }, { data: benchRaw }] =
      await Promise.all([
        supabase.from('profiles').select('timezone').eq('id', user.id).maybeSingle(),
        supabase.from('fans').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase
          .from('best_practice_library')
          .select('id, category, headline, summary, body')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(36),
        supabase
          .from('community_tips')
          .select('title, body')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(25),
        supabase
          .from('creator_internal_benchmarks')
          .select(
            'platform, niche_bucket, creator_count, fan_count_p25, fan_count_p50, fan_count_p75, fan_count_mean, dataset_creator_total, computed_at',
          )
          .in('platform', benchPlatforms)
          .order('creator_count', { ascending: false })
          .limit(48),
      ])

    const library = (libRows ?? []) as LibraryRow[]
    const tipList = (tips ?? []) as { title: string; body: string }[]
    const benchAll = (benchRaw ?? []) as InternalBenchmarkRow[]
    const benchForPrompt = selectBenchmarksForPrompt(benchAll, niche, 12)
    const cohortBlock = internalBenchmarksToPromptBlock(benchForPrompt)
    const tierBandGuide = buildTierBandGuide(fanCount, benchForPrompt)
    const datasetTotal = benchForPrompt[0]?.dataset_creator_total ?? 0

    let serperHits: DiscoveryHit[] = []
    if (useWebSearch) {
      serperHits = await runCompetitorDiscoverySearch({
        niche: niche || 'creator',
        platform,
      })
    }

    const webBlock = hitsToPromptBlock(serperHits)
    const libBlock = libraryToPromptBlock(library)
    const tipsBlock = tipsToAnonymizedDigest(tipList, 20, 500)
    const tz = (profile as { timezone?: string | null } | null)?.timezone

    const creatorContext = [
      fanCount != null && `Approx. fans in CRM (imported): ${fanCount}`,
      tz && `Timezone: ${tz}`,
      niche && `Stated niche: ${niche}`,
      `Primary platform focus: ${platform === 'fansly' ? 'Fansly' : 'OnlyFans'}`,
      competitorTargets && `Creator-supplied peer / competitor notes (public cues only):\n${competitorTargets}`,
      goals && `Goals / questions:\n${goals}`,
    ]
      .filter(Boolean)
      .join('\n')

    const system = `You help subscription-platform creators with **competitor-focused** positioning: compare **the creator to named competitors**, not generic market essays.

Rules:
- **Primary focus:** Contrast the creator with **competitors they named** (or clearly implied peers). Use the **tier band guide** to separate (1) peers in the **same anonymized stat band** as the creator’s imported CRM fans and (2) what typically characterizes competitors **one tier above** (next quartile band). When the creator did not name anyone, say so and still map archetypes to same-band vs tier-above using cohort + library — do not invent specific accounts.
- Use ONLY the evidence blocks below (internal CRM cohort benchmarks if present, tier band guide, web results, shared best-practice library, anonymized community tips, creator context). Do not invent follower counts, revenue, or private stats.
- **Internal benchmarks** describe imported fan rows across Creatix creators (p25/p50/p75 of fan counts per bucket). They are not public social followers and not the user's exact rank — use them as rough peer context only.
- If the user named specific accounts, treat those as user-supplied public cues — you still have no live API to their metrics.
- Never encourage harassment, stalking, or scraping paywalled content. Suggest ethical, marketing-level moves only.
- Use themes from the web block when relevant (no URL list is shown to the user).
- Chatting / commenting sections should reflect general professional practices plus patterns implied by the evidence blocks.
- Fill improvementPriorities with concrete, ordered actions (not generic "research online").
- Output must match the JSON schema exactly.`

    const userPrompt = `## Creator context
${creatorContext || '(minimal context provided)'}

## How to frame same band vs one tier above (use this in every section)
${tierBandGuide}

## Internal anonymized Creatix cohort (CRM-imported fans; your own product data when cohort is large enough)
${cohortBlock}

## Public web search results (titles, URLs, snippets)
${webBlock}

## Shared best-practice library (anonymized, product-wide)
${libBlock}

## Anonymized approved community tips (no author PII)
${tipsBlock}

Produce structured JSON per schema. Lead with competitor comparison (same band vs one tier above); be concrete and actionable.`

    const { object } = await generateObject({
      model: 'openai/gpt-4o-mini',
      schema: outputSchema,
      system,
      prompt: userPrompt,
    })

    const analysis = object as AnalysisOut
    const cohortPercentileSummary = buildCohortPercentileSummary(fanCount, benchForPrompt)

    const charged = await chargeAiToolCreditsAfterSuccess(supabase, user.id, creditCost, access.data.billingToolId)
    if (!charged.ok) return charged.response

    return NextResponse.json({
      ...analysis,
      cohortPercentileSummary,
      meta: {
        webSearchUsed: useWebSearch && serperHits.length > 0,
        webHitCount: serperHits.length,
        libraryRowCount: library.length,
        communityTipCount: tipList.length,
        fanCount: fanCount ?? null,
        internalCohortPublished: benchForPrompt.length > 0,
        internalCohortDatasetCreators: datasetTotal,
        internalBenchmarkBucketsInPrompt: benchForPrompt.length,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Competitor analysis failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
