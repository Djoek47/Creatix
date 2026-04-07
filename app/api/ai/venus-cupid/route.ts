import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { callGrok } from '@/lib/ai/grok-tools'
import { loadHybridCrmFans, pickNewestFansForCupid } from '@/lib/crm/load-hybrid-fans'
import type { CrmFanListItem } from '@/lib/crm/crm-fan-types'

export const maxDuration = 60

const CUPID_CHURN_NOTE =
  '[Cupid→Churn] New-subscriber onboarding — prioritize in Retention / Churn Predictor (early subs churn easily).'

const SYSTEM = `You are Cupid, son of Venus — specialist in **new subscriber onboarding**, first-touch care, and **early churn prevention**.

You receive a **real list** of the creator's newest fans from their CRM (saved rows + live platform lists when available). Your job:

1. **Acknowledge the table** — treat each row as a real person. Newer subscription starts matter most.
2. **Introduction & care** — For each fan or grouped themes: warm welcome angles, first DM ideas, follow-up rhythm (DM / story), and how to feel human (not scripted).
3. **Churn reality** — First billing cycles are fragile: silence, confusion, or weak first touch often means they never come back. Tie advice to **Retention → Churn Predictor** (scheduled digests) and **Messages** (refresh thread context).
4. **CRM + tools** — Reference Divine Manager tasks or AI Studio (e.g. Churn Predictor for one fan) where useful.
5. **Platform-safe** — Adult platforms: consent-forward, respectful, no harassment or illegal tactics.

Output **markdown** with:
## Newest fans (what stands out)
Short read of the batch.

## Playbooks (per fan or grouped)
Actionable bullets: intro, care, next touch.

## Tie-in: Churn & Retention
Why these fans belong in churn monitoring and what to run next (Churn Predictor, digest cadence).

## Quick wins
2–4 bullets max.`

function formatFanBlock(fans: CrmFanListItem[]): string {
  if (fans.length === 0) {
    return '(No subscribers in CRM yet — sync fans from Integrations, then re-run Cupid.)'
  }
  const lines = fans.map((f, i) => {
    const handle = f.platform_username || 'unknown'
    const name = f.display_name ? ` (${f.display_name})` : ''
    const src = f._source === 'database' ? 'CRM' : f._source === 'live_onlyfans' ? 'live OF' : 'live Fansly'
    const sub = f.subscription_start?.trim() ? f.subscription_start : '—'
    const last = f.last_interaction?.trim() ? f.last_interaction : '—'
    const spent = Number(f.total_spent ?? 0)
    return [
      `${i + 1}. @${handle}${name} · ${f.platform} · source: ${src}`,
      `   · subscription start (best known): ${sub}`,
      `   · last interaction: ${last} · approx. spend: ${spent}`,
    ].join('\n')
  })
  return lines.join('\n\n')
}

async function markDatabaseFansForChurnNotes(
  supabase: SupabaseClient,
  userId: string,
  fans: CrmFanListItem[],
): Promise<number> {
  let n = 0
  for (const f of fans) {
    if (f._source !== 'database') continue
    const id = f.id
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) continue

    const { data: row, error: selErr } = await supabase
      .from('fans')
      .select('id, notes')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()

    if (selErr || !row) continue
    const prev = typeof row.notes === 'string' ? row.notes.trim() : ''
    if (prev.includes('[Cupid→Churn]')) continue

    const next = prev ? `${prev}\n${CUPID_CHURN_NOTE}` : CUPID_CHURN_NOTE
    const { error: upErr } = await supabase
      .from('fans')
      .update({ notes: next, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)

    if (!upErr) n++
  }
  return n
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const xai = process.env.XAI_API_KEY
    if (!xai) return NextResponse.json({ error: 'Grok not configured' }, { status: 503 })

    const body = await req.json().catch(() => ({}))
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    const niche = typeof body.niche === 'string' ? body.niche.trim() : ''
    const tagForChurn = body.tagForChurn !== false
    const limit = Math.min(Math.max(parseInt(String(body.limit ?? '25'), 10) || 25, 8), 35)

    const loaded = await loadHybridCrmFans(supabase, user.id, {
      mode: 'hybrid',
      limitOf: 200,
      limitFansly: 200,
      billingPolicy: 'fallback_db',
    })
    if (!loaded.ok) {
      return NextResponse.json({ error: 'Could not load CRM fans' }, { status: 500 })
    }

    const warnings = loaded.meta.warnings ?? []
    const newest = pickNewestFansForCupid(loaded.fans, limit)

    let markedForChurnCount = 0
    if (tagForChurn && newest.length > 0) {
      markedForChurnCount = await markDatabaseFansForChurnNotes(supabase, user.id, newest)
    }

    const fanSummaries = newest.map((f) => ({
      id: f.id,
      username: f.platform_username || 'unknown',
      displayName: f.display_name,
      platform: f.platform,
      source: f._source ?? 'database',
      subscriptionStart: f.subscription_start ?? null,
      lastInteraction: f.last_interaction ?? null,
      totalSpent: Number(f.total_spent ?? 0),
    }))

    const userPrompt = [
      niche ? `Creator niche: ${niche}.` : '',
      '',
      '--- Newest fans (CRM + live lists, merged like the Fans page) ---',
      formatFanBlock(newest),
      '',
      warnings.length > 0 ? `Sync notes:\n${warnings.map((w) => `- ${w}`).join('\n')}` : '',
      '',
      'These fans are candidates for **first-week onboarding** and **churn prevention**.',
      tagForChurn
        ? `Fans with saved CRM rows were tagged in notes so you remember to include them in Churn Predictor digests (${markedForChurnCount} updated).`
        : 'Tagging CRM notes was skipped for this run.',
      '',
      prompt ||
        'Give onboarding playbooks and churn-aware follow-up. Emphasize why new subscribers are high churn risk until they feel seen.',
    ]
      .filter(Boolean)
      .join('\n')

    const content = await callGrok({ apiKey: xai, systemPrompt: SYSTEM, userPrompt })

    return NextResponse.json({
      content,
      newFans: fanSummaries,
      meta: {
        hybridTotal: loaded.meta.mergedTotal,
        databaseCount: loaded.meta.databaseCount,
        warnings,
      },
      markedForChurnCount,
      tagForChurn,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Cupid Arrow failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
