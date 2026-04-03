import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { z } from 'zod'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
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
  executiveSummary: z.string().describe('2–4 short paragraphs: what you inferred and limits of data'),
  marketContext: z.string().describe('How niche + platform typically compete; no fake statistics'),
  qualitativeTierNote: z.string().describe('Rough where the creator might sit vs archetypes — qualitative only'),
  peerArchetypes: z
    .array(
      z.object({
        label: z.string(),
        typicalPublicSignals: z.string(),
        ideasToBorrow: z.string(),
      }),
    )
    .max(6),
  differentiationAngles: z.array(z.string()).max(10),
  postingCadenceIdeas: z.array(z.string()).max(6),
  chattingAndDmTips: z.array(z.string()).max(8),
  commentingAndSocialTips: z.array(z.string()).max(8),
  howToUseSources: z.string().describe('Tell user to verify claims using provided URLs'),
  caveats: z.string().describe('Ethics: public info only, no harassment, estimates not guarantees'),
})

type AnalysisOut = z.infer<typeof outputSchema>

type LibraryRow = {
  id: string
  category: string
  headline: string
  summary: string | null
  body: string
  source_urls: unknown
}

function parseSourceUrls(raw: unknown): { url: string; title?: string }[] {
  if (!Array.isArray(raw)) return []
  const out: { url: string; title?: string }[] = []
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue
    const u = (x as { url?: string }).url
    if (typeof u !== 'string' || !u.trim()) continue
    const t = (x as { title?: string }).title
    out.push({ url: u.trim(), title: typeof t === 'string' ? t : undefined })
  }
  return out
}

function mergeSources(
  hits: DiscoveryHit[],
  libraryRows: LibraryRow[],
): { url: string; title: string }[] {
  const map = new Map<string, string>()
  for (const h of hits) {
    if (!h.link) continue
    const k = h.link.split('#')[0].toLowerCase()
    if (!map.has(k)) map.set(k, h.title || k)
  }
  for (const row of libraryRows) {
    for (const s of parseSourceUrls(row.source_urls)) {
      const k = s.url.split('#')[0].toLowerCase()
      if (!map.has(k)) map.set(k, s.title || s.url)
    }
  }
  return Array.from(map.entries()).map(([url, title]) => ({
    url,
    title: title.length > 120 ? `${title.slice(0, 117)}…` : title,
  }))
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

function platformKeysForBenchmarks(platform: string): string[] {
  const p = platform.toLowerCase()
  if (p === 'onlyfans' || p === 'fansly' || p === 'mym') return [p, 'all']
  if (p === 'multi') return ['onlyfans', 'fansly', 'mym', 'all']
  return ['all']
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
    const platform = typeof body.platform === 'string' ? body.platform.trim() : 'onlyfans'
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

    const benchPlatforms = [...new Set(platformKeysForBenchmarks(platform))]

    const [{ data: profile }, { count: fanCount }, { data: libRows }, { data: tips }, { data: benchRaw }] =
      await Promise.all([
        supabase.from('profiles').select('timezone').eq('id', user.id).maybeSingle(),
        supabase.from('fans').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase
          .from('best_practice_library')
          .select('id, category, headline, summary, body, source_urls')
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
      platform && `Primary platform focus: ${platform}`,
      competitorTargets && `Creator-supplied peer / competitor notes (public cues only):\n${competitorTargets}`,
      goals && `Goals / questions:\n${goals}`,
    ]
      .filter(Boolean)
      .join('\n')

    const system = `You help subscription-platform creators with strategic competitor and market positioning.

Rules:
- Use ONLY the evidence blocks below (internal CRM cohort benchmarks if present, web results, shared best-practice library, anonymized community tips, creator context). Do not invent follower counts, revenue, or private stats.
- **Internal benchmarks** describe imported fan rows across Creatix creators (p25/p50/p75 of fan counts per bucket). They are not public social followers and not the user's exact rank — use them as rough peer context only.
- If the user named specific accounts, treat those as user-supplied public cues — you still have no live API to their metrics.
- Never encourage harassment, stalking, or scraping paywalled content. Suggest ethical, marketing-level moves only.
- Cite themes from the web block when relevant; the app will attach URLs separately for the user.
- Chatting / commenting sections should reflect general professional practices plus patterns implied by the evidence blocks.
- Output must match the JSON schema exactly.`

    const userPrompt = `## Creator context
${creatorContext || '(minimal context provided)'}

## Internal anonymized Creatix cohort (CRM-imported fans; your own product data when cohort is large enough)
${cohortBlock}

## Public web search results (titles, URLs, snippets)
${webBlock}

## Shared best-practice library (anonymized, product-wide)
${libBlock}

## Anonymized approved community tips (no author PII)
${tipsBlock}

Produce structured JSON per schema. Be concrete and actionable.`

    const { object } = await generateObject({
      model: 'openai/gpt-4o-mini',
      schema: outputSchema,
      system,
      prompt: userPrompt,
    })

    const analysis = object as AnalysisOut
    const sources = mergeSources(serperHits, library)

    return NextResponse.json({
      ...analysis,
      sources,
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
