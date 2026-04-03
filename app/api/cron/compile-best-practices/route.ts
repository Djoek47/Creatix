import { NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { SerperProvider } from '@/lib/leaks/search-providers'

export const maxDuration = 300

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

const entrySchema = z.object({
  category: categoryEnum,
  headline: z.string().max(200),
  summary: z.string().max(800),
  body: z.string().max(8000),
  provenance: z.enum(['ai_cron', 'community_synthesis']),
  source_urls: z
    .array(
      z.object({
        url: z.string(),
        title: z.string().optional(),
      }),
    )
    .max(8),
})

const compileSchema = z.object({
  entries: z.array(entrySchema).max(14),
})

async function serperHits(): Promise<{ title: string; link: string; snippet: string }[]> {
  const key = process.env.SERPER_API_KEY
  if (!key) return []
  const provider = new SerperProvider(key)
  const queries = [
    'OnlyFans Fansly creator engagement tips 2025',
    'subscription content creator commenting strategy social media',
    'creator fan messaging boundaries professional tips',
  ]
  const out: { title: string; link: string; snippet: string }[] = []
  for (const q of queries) {
    try {
      const r = await provider.search(q, { limit: 5 })
      for (const x of r) {
        if (x.link) out.push({ title: x.title || x.link, link: x.link, snippet: x.snippet || '' })
      }
    } catch {
      // continue
    }
  }
  const seen = new Set<string>()
  return out.filter((h) => {
    const k = h.link.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const vercelCron = req.headers.get('x-vercel-cron')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && vercelCron !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const ts = new Date().toISOString()
  await supabase
    .from('best_practice_library')
    .update({ is_active: false, updated_at: ts })
    .eq('provenance', 'ai_cron')
  await supabase
    .from('best_practice_library')
    .update({ is_active: false, updated_at: ts })
    .eq('provenance', 'community_synthesis')

  const { data: tips } = await supabase
    .from('community_tips')
    .select('title, body')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(60)

  const tipDigest =
    (tips ?? [])
      .map((t, i) => {
        const body = typeof t.body === 'string' ? t.body : ''
        const b = body.slice(0, 450)
        return `(${i + 1}) ${t.title}\n${b}${body.length > 450 ? '…' : ''}`
      })
      .join('\n\n') || '(no approved tips)'

  const hits = await serperHits()
  const webCtx = hits.map((h, i) => `[${i + 1}] ${h.title} — ${h.link}\n${h.snippet}`).join('\n')

  const { object } = await generateObject({
    model: 'openai/gpt-4o-mini',
    schema: compileSchema,
    system: `You maintain a shared, anonymized library of creator best practices for a subscription-creator product.

Hard rules:
- Never include user IDs, real names, or anything that could identify a specific Creatix user.
- Turn community tips into generalized, reusable guidance (merge duplicates).
- For ai_cron entries: synthesize from the web search snippets; set source_urls to real URLs you were given (from the web block only), not invented links.
- For community_synthesis entries: derive from the anonymized tips block only; source_urls can be empty or a single link to your product community page if you have no URL — prefer [].
- Split entries roughly: half ai_cron (web-led), half community_synthesis when tips exist; if no tips, use only ai_cron.
- No explicit adult graphic content; keep professional creator-business tone.`,
    prompt: `## Web results (titles, URLs, snippets)\n${webCtx || '(no web results — SERPER missing)'}\n\n## Anonymized approved community tips\n${tipDigest}\n\nReturn JSON with up to 14 entries.`,
  })

  const rows = object.entries.map((e) => ({
    category: e.category,
    headline: e.headline,
    summary: e.summary,
    body: e.body,
    source_urls: e.source_urls,
    provenance: e.provenance,
    is_active: true,
    updated_at: new Date().toISOString(),
  }))

  let inserted = 0
  if (rows.length > 0) {
    const { error } = await supabase.from('best_practice_library').insert(rows)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    inserted = rows.length
  }

  return NextResponse.json({
    ok: true,
    inserted,
    webHits: hits.length,
    tipCount: tips?.length ?? 0,
  })
}
