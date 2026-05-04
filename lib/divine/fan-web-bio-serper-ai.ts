import { generateObject } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SearchResult } from '@/lib/leaks/search-providers'
import { SerperProvider } from '@/lib/leaks/search-providers'
import type { CreatorDetectorSignal } from '@/lib/divine/creator-detector'

type LooseSb = SupabaseClient<any, 'public', any, any>

/** Persist AI creator classification into thread insight profile_json (read by fan profile UI). */
export async function mergeCreatorDetectorIntoFanThreadInsight(
  supabase: LooseSb,
  userId: string,
  platform: 'onlyfans' | 'fansly',
  platformFanId: string,
  signal: CreatorDetectorSignal,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: row, error: selErr } = await supabase
    .from('fan_thread_insights')
    .select('profile_json, iteration')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('platform_fan_id', platformFanId)
    .maybeSingle()

  if (selErr) return { ok: false, error: selErr.message }

  const prev =
    row &&
    typeof (row as { profile_json?: unknown }).profile_json === 'object' &&
    (row as { profile_json?: unknown }).profile_json !== null
      ? ({
          ...((row as { profile_json: Record<string, unknown> }).profile_json as Record<string, unknown>),
        } as Record<string, unknown>)
      : ({} as Record<string, unknown>)

  prev.creator_detector = signal
  const iteration = (row as { iteration?: number } | null)?.iteration ?? 0
  const now = new Date().toISOString()

  const { error: upErr } = await supabase.from('fan_thread_insights').upsert(
    {
      user_id: userId,
      platform,
      platform_fan_id: platformFanId,
      profile_json: prev,
      updated_at: now,
      last_update_at: now,
      iteration: iteration + 1,
    },
    { onConflict: 'user_id,platform,platform_fan_id' },
  )

  if (upErr) return { ok: false, error: upErr.message }
  return { ok: true }
}

export function formatSerperResultsForBioPrompt(results: SearchResult[]): string {
  return results
    .slice(0, 14)
    .map((r, i) => {
      const title = String(r.title || '').slice(0, 180)
      const snippet = String(r.snippet || '').slice(0, 450)
      const link = String(r.link || '')
      return `[${i + 1}] ${title}\nURL: ${link}\n${snippet}`
    })
    .join('\n\n')
}

/** Run a small set of Serper queries and merge/dedupe by URL (platform-focused). */
export async function collectFanWebSerperHits(
  provider: SerperProvider,
  opts: { username: string; displayName: string | null; fanId: string },
  platform: 'onlyfans' | 'fansly' = 'onlyfans',
): Promise<SearchResult[]> {
  const rawU = opts.username.replace(/^@/, '').trim()
  const u = rawU.startsWith('fan_') ? '' : rawU
  const d = (opts.displayName || '').trim()
  const queries: string[] = []
  if (platform === 'fansly') {
    if (u) {
      queries.push(`site:fansly.com "${u}"`)
      queries.push(`"${u}" fansly creator`)
    }
    if (d && d.toLowerCase() !== u.toLowerCase()) {
      queries.push(`"${d}" fansly`)
    }
    if (queries.length === 0) {
      queries.push(`fansly fan id ${opts.fanId}`)
    }
  } else {
    if (u) {
      queries.push(`site:onlyfans.com "${u}"`)
      queries.push(`"${u}" onlyfans creator model`)
    }
    if (d && d.toLowerCase() !== u.toLowerCase()) {
      queries.push(`"${d}" onlyfans`)
    }
    if (queries.length === 0) {
      queries.push(`onlyfans fan id ${opts.fanId}`)
    }
  }

  const seen = new Set<string>()
  const out: SearchResult[] = []
  for (const q of queries) {
    const hits = await provider.search(q, { limit: 8, page: 1 })
    for (const h of hits) {
      const link = String(h.link || '').trim().toLowerCase()
      if (!link) continue
      if (seen.has(link)) continue
      seen.add(link)
      out.push(h)
      if (out.length >= 16) return out
    }
  }
  return out
}

const webBioAnalysisSchema = z.object({
  likely_fellow_creator: z
    .boolean()
    .describe(
      'True if snippets indicate they run or promote paid adult creator work (OnlyFans, Fansly, similar model page, tip menu, collab, sell content, etc.). False for typical subscribers/fans.',
    ),
  confidence: z.number().min(0).max(1).describe('Confidence in likely_fellow_creator (0–1).'),
  creator_bio: z
    .string()
    .nullable()
    .describe(
      'One concise paragraph: public-facing bio or how they describe their page, from the evidence only. Null if nothing trustworthy.',
    ),
  rationale_snippets: z
    .array(z.string())
    .max(6)
    .describe('Very short reasons (can lightly quote snippets).'),
})

export type WebBioSerperAnalysis = z.infer<typeof webBioAnalysisSchema>

export function analysisToCreatorDetector(analysis: WebBioSerperAnalysis): CreatorDetectorSignal {
  return {
    is_creator_likely: analysis.likely_fellow_creator === true,
    confidence: Math.min(1, Math.max(0, analysis.confidence)),
    rationale_snippets: (analysis.rationale_snippets ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 6),
  }
}

export async function analyzeSerperHitsForFanCreatorBio(
  evidenceMarkdown: string,
  subjectLine: string,
  platform: 'onlyfans' | 'fansly' = 'onlyfans',
): Promise<WebBioSerperAnalysis> {
  const platformHint =
    platform === 'fansly'
      ? 'Snippets are biased toward Fansly and general web; they may still mention OnlyFans or other platforms.'
      : 'Snippets are biased toward OnlyFans and general web; they may mention Fansly or other platforms.'
  const { object } = await generateObject({
    model: 'openai/gpt-4o-mini',
    schema: webBioAnalysisSchema,
    system: `You classify a person using only the web search snippets provided (no browsing).
Decide if they are likely a *fellow creator* (runs or promotes paid adult content on OnlyFans, Fansly, or similar) versus a typical fan or ambiguous.
${platformHint}
Extract a short public-facing bio only if snippets support it; otherwise null.
Be conservative: false if evidence is ads, unrelated namesakes, or too thin.`,
    prompt: `Subject (inbox fan / CRM):\n${subjectLine}\n\n--- Web results (titles, URLs, snippets) ---\n${evidenceMarkdown}`,
  })
  return object
}
