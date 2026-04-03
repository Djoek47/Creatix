import { generateText } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { isPaidPlanId } from '@/lib/billing/access'
import { loadOnlyFansDmMessageCache } from '@/lib/messages/of-dm-cache'
import { formatThreadTextForAi, normalizeSortedRawOfMessages } from '@/lib/divine/of-thread-text'

export const maxDuration = 60

/** OF payloads often omit isSentByMe; infer from fromUser.id vs platform fan id. */
function coerceRawMessagesForThreadAi(rawList: unknown[], platformFanId: string): unknown[] {
  const fanKey = String(platformFanId)
  return rawList.map((raw) => {
    if (!raw || typeof raw !== 'object') return raw
    const m = { ...(raw as Record<string, unknown>) }
    if (typeof m.isSentByMe !== 'boolean') {
      const fu =
        m.fromUser && typeof m.fromUser === 'object' ? (m.fromUser as Record<string, unknown>) : null
      const fromId = fu?.id
      m.isSentByMe = String(fromId ?? '') !== fanKey
    }
    return m
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id, ai_credits_used, ai_credits_limit')
    .eq('user_id', user.id)
    .maybeSingle()

  const planId = (subscription as { plan_id?: string } | null)?.plan_id?.toLowerCase() || null
  const isPro = Boolean(planId && isPaidPlanId(planId))
  if (!isPro) {
    return NextResponse.json({ error: 'Pro subscription required for Churn Predictor' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({})) as {
    fanId?: string
    fanData?: string
    recentActivity?: string
    subscriptionLength?: string
    spendingHistory?: string
  }

  const used = (subscription as { ai_credits_used?: number } | null)?.ai_credits_used ?? 0
  const limit = (subscription as { ai_credits_limit?: number } | null)?.ai_credits_limit ?? 100
  if (limit < 999999 && used >= limit) {
    return NextResponse.json({ error: 'AI credits exhausted' }, { status: 402 })
  }

  let fanBlock = ''
  let threadExcerpt = ''
  let profileHint = ''
  let renewalBlock = ''
  let churnSnapshotBlock = ''

  if (body.fanId && typeof body.fanId === 'string') {
    const trimmed = body.fanId.trim()
    const fanSelect =
      'id, platform, platform_fan_id, username, display_name, total_spent, subscription_status, subscription_tier, last_interaction_at, first_subscribed_at, notes, subscription_expires_at, subscription_renews_on, is_renewing'

    let fan: Record<string, unknown> | null = null
    const byId = await supabase
      .from('fans')
      .select(fanSelect)
      .eq('id', trimmed)
      .eq('user_id', user.id)
      .maybeSingle()

    if (byId.error) {
      return NextResponse.json({ error: 'Fan not found' }, { status: 404 })
    }
    if (byId.data) {
      fan = byId.data as Record<string, unknown>
    } else {
      const { data: byPfidRows, error: pfidErr } = await supabase
        .from('fans')
        .select(fanSelect)
        .eq('platform_fan_id', trimmed)
        .eq('user_id', user.id)
        .order('total_spent', { ascending: false })
        .limit(1)

      if (pfidErr || !byPfidRows?.length) {
        return NextResponse.json(
          {
            error:
              'Fan not found in CRM. If they came from the live subscriber list only, pick them again after a Fans sync, or use Manual entry.',
          },
          { status: 404 },
        )
      }
      fan = byPfidRows[0] as Record<string, unknown>
    }

    if (!fan) {
      return NextResponse.json({ error: 'Fan not found' }, { status: 404 })
    }

    const f = fan
    const spent = Number(f.total_spent ?? 0)
    const tier = String(f.subscription_tier || 'regular')
    const status = String(f.subscription_status || 'unknown')
    const lastAt = f.last_interaction_at ? String(f.last_interaction_at) : 'unknown'
    const firstSub = f.first_subscribed_at ? String(f.first_subscribed_at) : 'unknown'
    const platform = String(f.platform || 'onlyfans')
    const pfid = f.platform_fan_id != null ? String(f.platform_fan_id) : ''
    const expAt =
      f.subscription_expires_at != null && String(f.subscription_expires_at).trim()
        ? String(f.subscription_expires_at)
        : ''
    const renOn =
      f.subscription_renews_on != null && String(f.subscription_renews_on).trim()
        ? String(f.subscription_renews_on)
        : ''
    const renewOn = f.is_renewing === true

    fanBlock = [
      `Fan: @${f.username} (${f.display_name || 'no display name'})`,
      `Platform: ${platform}`,
      `CRM id: ${f.id}`,
      `Lifetime spend (recorded): ${spent}`,
      `Tier label: ${tier}`,
      `Subscription status: ${status}`,
      `First subscribed at: ${firstSub}`,
      `Last interaction at: ${lastAt}`,
      expAt ? `Subscription period end (CRM sync, UTC): ${expAt}` : '',
      renOn ? `Next renewal timestamp if provided: ${renOn}` : '',
      `Auto-renew flag (CRM): ${renewOn ? 'on' : 'off or unknown'}`,
      f.notes ? `Creator notes: ${String(f.notes).slice(0, 500)}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const { data: churnSnap, error: churnSnapErr } = await supabase
      .from('fan_churn_snapshots')
      .select('risk_level, one_line, updated_at')
      .eq('user_id', user.id)
      .eq('fan_id', String(f.id))
      .maybeSingle()

    if (churnSnapErr) {
      console.warn('[churn-predictor] fan_churn_snapshots:', churnSnapErr.message)
    }

    const cs = churnSnap as Record<string, unknown> | null
    if (cs) {
      churnSnapshotBlock = [
        typeof cs.risk_level === 'string' ? `Latest background churn model level: ${cs.risk_level}` : '',
        typeof cs.one_line === 'string' && cs.one_line.trim() ? `Model summary: ${cs.one_line.trim()}` : '',
        typeof cs.updated_at === 'string' ? `(Updated ${cs.updated_at})` : '',
      ]
        .filter(Boolean)
        .join('\n')
    }

    if (pfid) {
      const { data: insight } = await supabase
        .from('fan_thread_insights')
        .select('thread_snapshot_text, summary_excerpt, profile_json')
        .eq('user_id', user.id)
        .eq('platform', platform)
        .eq('platform_fan_id', pfid)
        .maybeSingle()

      const ins = insight as Record<string, unknown> | null
      if (ins?.thread_snapshot_text && typeof ins.thread_snapshot_text === 'string') {
        threadExcerpt = ins.thread_snapshot_text.slice(0, 10000)
      }
      if (ins?.summary_excerpt && typeof ins.summary_excerpt === 'string') {
        threadExcerpt = [threadExcerpt, `Summary: ${ins.summary_excerpt}`.slice(0, 2000)].filter(Boolean).join('\n\n')
      }
      if (ins?.profile_json != null) {
        try {
          profileHint = JSON.stringify(ins.profile_json).slice(0, 4000)
        } catch {
          profileHint = ''
        }
      }

      if (!threadExcerpt.trim() && platform === 'onlyfans') {
        const { messages: cachedPayloads } = await loadOnlyFansDmMessageCache(
          supabase,
          user.id,
          pfid,
          100,
        )
        if (cachedPayloads.length > 0) {
          const coerced = coerceRawMessagesForThreadAi(cachedPayloads, pfid)
          const normalized = normalizeSortedRawOfMessages(coerced)
          if (normalized.length > 0) {
            threadExcerpt = formatThreadTextForAi(normalized, {
              lastN: 50,
              lineMax: 600,
              maxTotalChars: 8000,
            })
          }
        }
      }
    }

    if (status === 'expired' || status === 'cancelled') {
      renewalBlock = `Fan subscription status is "${status}" — prioritize win-back: what they valued before, soft re-entry, and a clear reason to resubscribe (platform-safe offers only).`
    } else if (status === 'active') {
      const periodHint = expAt
        ? ` Current period ends at ${expAt} (UTC). ${renewOn ? '' : 'Auto-renew appears off — higher lapse risk if they do not manually renew.'}`
        : ' No subscription period end in CRM — suggest syncing OnlyFans/Fansly for clearer renewal timing.'
      renewalBlock = `Fan is currently active — focus on spend trend vs their baseline, attention before natural renewal windows, and treats that match thread signals (no explicit promises you cannot keep).${periodHint}`
    }
  } else {
    fanBlock = body.fanData?.trim() || 'General subscriber (no CRM row selected).'
    renewalBlock = body.subscriptionLength ? `Stated subscription context: ${body.subscriptionLength}` : ''
  }

  const manualRecent = body.recentActivity?.trim() || ''
  const manualSpend = body.spendingHistory?.trim() || ''

  const { text } = await generateText({
    model: 'anthropic/claude-sonnet-4',
    system: `You are Circe, guardian of creator revenue. You predict churn risk and give practical, platform-safe retention playbooks for OnlyFans-style businesses.

Principles:
- Use spend level vs typical "whale" thresholds when data allows; call out when spend is cooling vs their own baseline.
- Use DM thread excerpts to infer what the fan responds to (attention, exclusivity, specific content angles) without being creepy or explicit.
- If subscription is expiring, ending, or already lapsed, emphasize timely attention, authentic check-ins, and tasteful "treats" (discounts, bundles, personalized messages) that comply with platform rules.
- Never instruct harassment, manipulation of minors, or non-consensual behavior. Keep offers legal and platform-appropriate.

Output rules:
- Write in normal sentence case. Do NOT fill the response with ALL-CAPS placeholders like "UNKNOWN", "INCOMPLETE DATA", or "DATA MISSING" for every section when CRM fields above are present — give your best evidence-based estimate from what you were given.
- If DM thread text is missing, add one short paragraph on how to gather it (open Messages, run thread scan) then still deliver items 1–7 using CRM + notes only.
- Never output a fake "matrix" where every line is the same refusal; that helps no one.`,
    prompt: `Analyze churn / retention for this fan.

## CRM snapshot
${fanBlock}

## Background churn snapshot (may be empty)
${churnSnapshotBlock || '(No prior background churn snapshot for this CRM fan.)'}

## Spending / activity notes (creator-supplied or inferred)
${manualSpend ? `Spending history note: ${manualSpend}` : '(No extra spending narrative provided.)'}
${manualRecent ? `Recent behavior note: ${manualRecent}` : ''}

## Renewal / status playbook
${renewalBlock || '(No special renewal flag.)'}

## Thread / personality context (may be empty)
${threadExcerpt ? `Thread excerpt (from stored insight and/or synced DM cache):\n${threadExcerpt}` : '(No thread text yet — use CRM only; suggest opening Messages so DMs can sync into cache.)'}
${profileHint ? `\nStructured profile hints:\n${profileHint}` : ''}

Respond with:
1) Churn risk (Low/Medium/High/Critical) + one-line rationale
2) Baseline spend vs current signals (cooling, steady, heating)
3) What the thread suggests they crave (themes, not explicit content) — if no thread, infer cautiously from CRM tier/spend/timing
4) Concrete next 3 actions (timing + channel: DM, post, PPV teaser, etc.)
5) "Treat" ideas that match their taste (platform-safe)
6) If expiring/lapsed: win-back sequence (short bullet timeline); if active, say "N/A — currently subscribed"
7) A ready-to-send message draft the creator can edit (warm, not desperate)`,
  })

  if (limit < 999999) {
    await supabase
      .from('subscriptions')
      .update({ ai_credits_used: used + 1 })
      .eq('user_id', user.id)
  }

  return NextResponse.json({
    content: text,
    creditsUsed: limit < 999999 ? used + 1 : used,
  })
}
