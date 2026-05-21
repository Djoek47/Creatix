import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { getFanNotifySnapshot } from '@/lib/divine/notification-fan-context'
import { utcPlanDateString } from '@/lib/divine/protocol-plan-rollover'
import { CRM_NOTIFICATION_ID_RE, type NotificationBriefingItem } from '@/lib/notification-briefing-types'

export type { NotificationBriefingItem } from '@/lib/notification-briefing-types'

export type NotificationBriefingResponse = {
  script: string
  items: NotificationBriefingItem[]
  /** When `ensure_protocol_tasks` was true: new rows inserted (skips if a pending/executing task already links the notification). */
  protocol_tasks_created?: number
}

/**
 * POST { notification_ids?: string[], all_unread?: boolean }
 * LLM briefing from selected notifications + optional fan thread/classification context.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as {
      notification_ids?: string[]
      all_unread?: boolean
      /** Create `creator_protocol_tasks` linked to each briefed notification until the creator marks them done. */
      ensure_protocol_tasks?: boolean
    }

    let query = supabase
      .from('notifications')
      .select('id, title, description, type, platform, platform_fan_id, metadata, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(80)

    if (body.all_unread === true) {
      query = query.eq('read', false)
    } else if (Array.isArray(body.notification_ids) && body.notification_ids.length > 0) {
      const ids = body.notification_ids.map((x) => String(x).trim()).filter(Boolean).slice(0, 40)
      query = query.in('id', ids)
    } else {
      return NextResponse.json(
        { error: 'Provide notification_ids or all_unread: true' },
        { status: 400 },
      )
    }

    const { data: rows, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const list = rows ?? []
    if (list.length === 0) {
      return NextResponse.json({
        script: 'No notifications to brief.',
        items: [],
      } satisfies NotificationBriefingResponse)
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Briefing requires OPENAI_API_KEY' },
        { status: 503 },
      )
    }

    const contextBlocks: string[] = []
    for (const n of list) {
      const row = n as {
        id: string
        title?: string
        description?: string
        type?: string
        platform?: string | null
        platform_fan_id?: string | null
        metadata?: unknown
      }
      let extra = ''
      if (row.platform_fan_id && (row.platform === 'onlyfans' || row.platform === 'fansly')) {
        const snap = await getFanNotifySnapshot(
          supabase,
          user.id,
          row.platform,
          row.platform_fan_id,
        )
        const bits: string[] = []
        if (snap.creator_classification) bits.push(`classification: ${snap.creator_classification}`)
        if (snap.thread_excerpt) bits.push(`thread_excerpt: ${snap.thread_excerpt.slice(0, 220)}`)
        if (snap.profile_tone) bits.push(`tone: ${snap.profile_tone}`)
        if (snap.tier) bits.push(`tier: ${snap.tier}`)
        if (bits.length) extra = `\nContext: ${bits.join(' | ')}`
      }
      contextBlocks.push(
        `- [${row.id}] ${row.title ?? ''}: ${(row.description ?? '').slice(0, 400)}${extra}`,
      )
    }

    const { generateText } = await import('ai')
    const { gateway } = await import('@ai-sdk/gateway')
    const { text } = await generateText({
      model: gateway('openai/gpt-4o-mini'),
      temperature: 0.25,
      maxOutputTokens: 2200,
      prompt: `You are a concise executive assistant for an adult creator CRM. Given notification lines, output VALID JSON ONLY (no markdown).

Schema:
{
  "script": string,
  "items": Array<{
    "notification_id": string,
    "summary": string,
    "suggested_action": string,
    "todos": string[]
  }>
}

Rules:
- One item per notification id that appears in the input; same order as listed.
- script: short spoken-style rundown (2–6 sentences total), as if a calm human assistant is about to walk the creator through their queue.
- summary: one line per item; suggested_action: one line; todos: 0–3 short imperative tasks each (concrete next steps until handled).
- Do not invent notification ids. Use only ids from brackets [uuid] in the input.
- Respect boundaries: no minors, no illegal content.

Notifications:
${contextBlocks.join('\n')}`,
    })

    const raw = (text || '').trim()
    const jsonStart = raw.indexOf('{')
    const jsonEnd = raw.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd <= jsonStart) {
      return NextResponse.json({ error: 'Briefing parse failed' }, { status: 502 })
    }
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as NotificationBriefingResponse
    if (typeof parsed.script !== 'string' || !Array.isArray(parsed.items)) {
      return NextResponse.json({ error: 'Briefing shape invalid' }, { status: 502 })
    }

    const items = parsed.items.slice(0, 40)
    const scriptOut = parsed.script.slice(0, 8000)

    let protocol_tasks_created = 0
    if (body.ensure_protocol_tasks === true && items.length > 0) {
      const planDate = utcPlanDateString()
      const rowById = new Map(
        list.map((n) => {
          const row = n as { id: string; title?: string }
          return [row.id, row] as const
        }),
      )

      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        const nid = String(it?.notification_id ?? '').trim()
        if (!CRM_NOTIFICATION_ID_RE.test(nid) || !rowById.has(nid)) continue

        const { data: existing } = await supabase
          .from('creator_protocol_tasks')
          .select('id')
          .eq('user_id', user.id)
          .eq('linked_notification_id', nid)
          .in('status', ['pending', 'executing'])
          .limit(1)

        if (existing && existing.length > 0) continue

        const summary =
          typeof it.summary === 'string' && it.summary.trim() ? it.summary.trim().slice(0, 500) : ''
        const notifRow = rowById.get(nid) as { title?: string } | undefined
        const title =
          summary ||
          (typeof notifRow?.title === 'string' && notifRow.title.trim()
            ? notifRow.title.trim().slice(0, 500)
            : 'Notification follow-up')

        const action =
          typeof it.suggested_action === 'string' && it.suggested_action.trim()
            ? it.suggested_action.trim()
            : ''
        const todoLines = Array.isArray(it.todos)
          ? it.todos.filter((t): t is string => typeof t === 'string' && t.trim().length > 0).slice(0, 5)
          : []
        const bodyParts = [
          action,
          todoLines.length ? `Steps:\n${todoLines.map((t) => `• ${t}`).join('\n')}` : '',
        ].filter(Boolean)
        const taskBody = bodyParts.join('\n\n').slice(0, 4000) || null

        const { error: insErr } = await supabase.from('creator_protocol_tasks').insert({
          user_id: user.id,
          title,
          body: taskBody,
          status: 'pending',
          source: 'divine',
          linked_notification_id: nid,
          metadata: { from_notification_briefing: true },
          priority_tier: 1,
          sort_order: i * 10,
          plan_date: planDate,
        })
        if (!insErr) protocol_tasks_created += 1
      }
    }

    return NextResponse.json({
      script: scriptOut,
      items,
      ...(body.ensure_protocol_tasks === true ? { protocol_tasks_created } : {}),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Briefing failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
