import type { SupabaseClient } from '@supabase/supabase-js'
import type { NormalizedChatMessage } from '@/lib/ai/message-suggestions'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import { formatThreadTextForAi, normalizeSortedRawOfMessages } from '@/lib/divine/of-thread-text'
import { formatFanCommerceContextForAi, type SubscriptionAccountType } from '@/lib/fans/subscription-account-type'
import {
  formatCreatorOnlyFansPageModelForAi,
  parseOnlyFansCreatorPageModel,
} from '@/lib/onlyfans/creator-page-model'

type FanRecord = { id: string; username: string; name: string | null }

type ContinuityMemory = {
  topics?: string[]
  lastFanMessage?: string
  lastCreatorMessage?: string
  lastCreatorPromise?: string
  updatedAt?: string
}

export type OnlyFansMessagingContext = {
  fan: FanRecord
  fanForAi: { id: string; username: string; name?: string }
  messages: NormalizedChatMessage[]
  threadPreview: string
  threadSupplement?: string
  fanCommerceContext?: string
  creatorPageContext?: string
  niches: string[]
  boundaries: string[]
  latestFanMessageAt: string | null
}

const STOPWORDS = new Set([
  'about',
  'after',
  'again',
  'been',
  'before',
  'being',
  'from',
  'have',
  'just',
  'like',
  'make',
  'more',
  'really',
  'still',
  'that',
  'there',
  'they',
  'this',
  'want',
  'with',
  'would',
  'your',
  'youre',
  'were',
  'theyre',
  'cant',
  'dont',
  'into',
  'what',
  'when',
  'where',
  'been',
  'lets',
])

function extractTopics(messages: NormalizedChatMessage[]): string[] {
  const score = new Map<string, number>()
  for (const row of messages.slice(-24)) {
    const text = String(row.text || '').toLowerCase()
    const words = text.match(/[a-z0-9]{4,}/g) || []
    for (const raw of words) {
      if (STOPWORDS.has(raw)) continue
      score.set(raw, (score.get(raw) || 0) + 1)
    }
  }
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)
}

function extractLastCreatorPromise(messages: NormalizedChatMessage[]): string | undefined {
  const promiseRegex = /\b(i(?:'| a)m|i('| )?ll|i will|tomorrow|later|send you|after this|next time)\b/i
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const row = messages[i]
    if (row.from !== 'creator') continue
    const text = String(row.text || '').replace(/\s+/g, ' ').trim()
    if (!text) continue
    if (promiseRegex.test(text)) return text.slice(0, 280)
  }
  return undefined
}

function parseContinuityMemory(raw: unknown): ContinuityMemory | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const topics = Array.isArray(obj.topics)
    ? obj.topics.map((v) => String(v).trim()).filter(Boolean).slice(0, 5)
    : undefined
  const lastFanMessage =
    typeof obj.lastFanMessage === 'string' ? obj.lastFanMessage.trim().slice(0, 280) : undefined
  const lastCreatorMessage =
    typeof obj.lastCreatorMessage === 'string' ? obj.lastCreatorMessage.trim().slice(0, 280) : undefined
  const lastCreatorPromise =
    typeof obj.lastCreatorPromise === 'string' ? obj.lastCreatorPromise.trim().slice(0, 280) : undefined
  const updatedAt = typeof obj.updatedAt === 'string' ? obj.updatedAt.slice(0, 50) : undefined
  if (!topics?.length && !lastFanMessage && !lastCreatorMessage && !lastCreatorPromise) return null
  return { topics, lastFanMessage, lastCreatorMessage, lastCreatorPromise, updatedAt }
}

function compactLine(label: string, value?: string | null): string | null {
  const v = typeof value === 'string' ? value.trim() : ''
  if (!v) return null
  return `${label}: ${v.slice(0, 280)}`
}

function buildContinuitySupplement(opts: {
  memory: ContinuityMemory | null
  calendarContext?: string
  newsContext?: string
}): string | undefined {
  const lines: string[] = []
  if (opts.memory?.topics?.length) lines.push(`Recent recurring topics: ${opts.memory.topics.join(', ')}`)
  const fan = compactLine('Last fan message summary', opts.memory?.lastFanMessage)
  if (fan) lines.push(fan)
  const creator = compactLine('Last creator message summary', opts.memory?.lastCreatorMessage)
  if (creator) lines.push(creator)
  const promise = compactLine('Last creator promise / pending follow-up', opts.memory?.lastCreatorPromise)
  if (promise) lines.push(promise)
  const calendar = compactLine('Creator calendar context', opts.calendarContext)
  if (calendar) lines.push(calendar)
  const news = compactLine('External context notes', opts.newsContext)
  if (news) lines.push(news)
  if (!lines.length) return undefined
  return `Continuity memory:\n${lines.join('\n')}`
}

function parseGlobalMemoryContexts(raw: unknown): { calendarContext?: string; newsContext?: string } {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  const calendarCandidates = [
    o.messaging_calendar_context,
    o.calendar_context,
    o.calendar_notes,
    (o.messaging_context as Record<string, unknown> | undefined)?.calendar,
  ]
  const newsCandidates = [
    o.messaging_news_context,
    o.news_context,
    o.news_notes,
    (o.messaging_context as Record<string, unknown> | undefined)?.news,
  ]
  const pick = (arr: unknown[]) =>
    arr
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .find((v) => v.length > 0)
      ?.slice(0, 400)
  return {
    calendarContext: pick(calendarCandidates),
    newsContext: pick(newsCandidates),
  }
}

export async function loadOnlyFansMessagingContext(
  supabase: SupabaseClient,
  userId: string,
  body: { fanId?: string; fan_id?: string; username?: string; name?: string },
): Promise<{ error: string; notFound?: boolean } | OnlyFansMessagingContext> {
  const fanId = body.fanId ?? body.fan_id
  if (!fanId) return { error: 'fanId required' }

  const { data: connection } = await supabase
    .from('platform_connections')
    .select('access_token, onlyfans_creator_page_model')
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .eq('is_connected', true)
    .maybeSingle()

  if (!connection?.access_token) {
    return { error: 'OnlyFans not connected' }
  }

  const api = createOnlyFansAPI(connection.access_token)
  let threadRes: { messages?: unknown[] }
  let convRes: { conversations?: unknown[] }
  try {
    ;[threadRes, convRes] = await Promise.all([
      api.getMessages(String(fanId), { limit: 80 }),
      api.getConversations({ limit: 60 }),
    ])
  } catch (e) {
    const msg = e instanceof Error ? e.message || '' : String(e ?? '')
    if (msg.toLowerCase().includes('resource was not found')) {
      return { error: 'Thread not found for this fan.', notFound: true }
    }
    return { error: msg || 'Failed to fetch thread from OnlyFans' }
  }

  const fanFromConv = ((convRes?.conversations || []) as any[]).find(
    (c: any) => String(c.user?.id) === String(fanId),
  )
  const fanName = body.name ?? fanFromConv?.user?.name ?? null
  const fan: FanRecord = {
    id: String(fanId),
    username: body.username ?? fanFromConv?.user?.username ?? 'fan',
    name: fanName,
  }
  const fanForAi = {
    id: String(fanId),
    username: fan.username,
    ...(fan.name ? { name: fan.name } : {}),
  }

  const rawMessages = ((threadRes?.messages || []) as any[]).sort(
    (a: any, b: any) => new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime(),
  )
  const messages = normalizeSortedRawOfMessages(rawMessages)
  const threadPreview =
    messages.length > 0
      ? formatThreadTextForAi(messages, {
          lastN: 50,
          lineMax: 800,
          maxTotalChars: 12000,
        })
      : ''

  const [crmRes, settingsRes, insightRes, fanSummaryRes, profileRes] = await Promise.all([
    supabase
      .from('fans')
      .select('subscription_account_type, subscription_price, subscription_status')
      .eq('user_id', userId)
      .eq('platform', 'onlyfans')
      .eq('platform_fan_id', String(fanId))
      .maybeSingle(),
    supabase.from('divine_manager_settings').select('persona').eq('user_id', userId).maybeSingle(),
    supabase
      .from('fan_thread_insights')
      .select('thread_snapshot_text, notification_context_json, updated_at')
      .eq('user_id', userId)
      .eq('platform', 'onlyfans')
      .eq('platform_fan_id', String(fanId))
      .maybeSingle(),
    supabase
      .from('fan_ai_summaries')
      .select('summary_json, updated_at')
      .eq('user_id', userId)
      .eq('platform_fan_id', String(fanId))
      .maybeSingle(),
    supabase.from('profiles').select('divine_voice_memory').eq('id', userId).maybeSingle(),
  ])

  const crm = crmRes.data as
    | {
        subscription_account_type?: string | null
        subscription_price?: string | number | null
        subscription_status?: string | null
      }
    | null
  const fanCommerceContext =
    crm != null
      ? formatFanCommerceContextForAi({
          subscriptionAccountType: (crm.subscription_account_type as SubscriptionAccountType) || 'unknown',
          subscriptionPrice:
            crm.subscription_price != null && !Number.isNaN(Number(crm.subscription_price))
              ? Number(crm.subscription_price)
              : null,
          subscriptionStatus: crm.subscription_status,
        })
      : undefined

  const creatorPageContext = formatCreatorOnlyFansPageModelForAi(
    parseOnlyFansCreatorPageModel(
      (connection as { onlyfans_creator_page_model?: string | null } | null)?.onlyfans_creator_page_model,
    ),
  )

  const persona = (settingsRes.data?.persona as Record<string, unknown>) ?? {}
  const niches = (persona.niches as string[]) ?? []
  const boundaries = (persona.boundaries as string[]) ?? []

  const fanSumRow = fanSummaryRes.data as { summary_json?: unknown } | null
  const insightRow = insightRes.data as
    | { thread_snapshot_text?: string | null; notification_context_json?: unknown }
    | null
  const globalMemory = (profileRes.data as { divine_voice_memory?: unknown } | null)?.divine_voice_memory

  const continuityMemory = parseContinuityMemory(
    (insightRow?.notification_context_json as Record<string, unknown> | null | undefined)?.suggestion_memory,
  )
  const globalContexts = parseGlobalMemoryContexts(globalMemory)
  const continuitySupplement = buildContinuitySupplement({
    memory: continuityMemory,
    calendarContext: globalContexts.calendarContext,
    newsContext: globalContexts.newsContext,
  })

  const supplementParts: string[] = []
  if (fanSumRow?.summary_json != null) {
    const j = fanSumRow.summary_json
    supplementParts.push(
      `Fan AI summary (from profile):\n${typeof j === 'string' ? j : JSON.stringify(j).slice(0, 1800)}`,
    )
  }
  if (threadPreview.length < 400 && insightRow?.thread_snapshot_text?.trim()) {
    supplementParts.push(
      `Stored thread snapshot (last Divine scan):\n${insightRow.thread_snapshot_text.slice(0, 2500)}`,
    )
  }
  if (continuitySupplement) supplementParts.push(continuitySupplement)

  const latestFanMessageAt = (() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const row = messages[i]
      if (row.from === 'fan' && row.createdAt) return row.createdAt
    }
    return null
  })()

  return {
    fan,
    fanForAi,
    messages,
    threadPreview,
    threadSupplement: supplementParts.length ? supplementParts.join('\n\n') : undefined,
    fanCommerceContext,
    creatorPageContext,
    niches,
    boundaries,
    latestFanMessageAt,
  }
}

export async function updateOnlyFansSuggestionMemory(
  supabase: SupabaseClient,
  userId: string,
  fanId: string,
  messages: NormalizedChatMessage[],
): Promise<void> {
  const trimmed = messages
    .map((m) => ({ ...m, text: String(m.text || '').replace(/\s+/g, ' ').trim() }))
    .filter((m) => m.text.length > 0)
  if (!trimmed.length) return

  const latestFanMessage = [...trimmed].reverse().find((m) => m.from === 'fan')?.text
  const latestCreatorMessage = [...trimmed].reverse().find((m) => m.from === 'creator')?.text
  const suggestionMemory: ContinuityMemory = {
    topics: extractTopics(trimmed),
    lastFanMessage: latestFanMessage?.slice(0, 280),
    lastCreatorMessage: latestCreatorMessage?.slice(0, 280),
    lastCreatorPromise: extractLastCreatorPromise(trimmed),
    updatedAt: new Date().toISOString(),
  }

  const { data: existing } = await supabase
    .from('fan_thread_insights')
    .select('notification_context_json')
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .eq('platform_fan_id', String(fanId))
    .maybeSingle()

  const prevNotification =
    ((existing as { notification_context_json?: unknown } | null)?.notification_context_json as
      | Record<string, unknown>
      | null
      | undefined) ?? {}

  const patch = {
    ...prevNotification,
    suggestion_memory: suggestionMemory,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('fan_thread_insights')
    .update({
      notification_context_json: patch,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('platform', 'onlyfans')
    .eq('platform_fan_id', String(fanId))

  if (!error) return
  await supabase.from('fan_thread_insights').upsert(
    {
      user_id: userId,
      platform: 'onlyfans',
      platform_fan_id: String(fanId),
      notification_context_json: patch,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,platform,platform_fan_id' },
  )
}
