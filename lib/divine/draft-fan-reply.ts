import type { SupabaseClient } from '@supabase/supabase-js'
import { loadOnlyFansMessagingContext } from '@/lib/divine/onlyfans-messaging-context'
import { parseMimicProfile, DEFAULT_MIMIC_PROFILE } from '@/lib/divine/mimic-types'
import { createOpenAiBackgroundJob } from '@/lib/openai/background-jobs'

const OPENAI_MODEL = 'gpt-4o-mini'
/** Responses / chat — queue background when webhook + prompts are expensive. */
const MIMIC_BG_MIN_CHARS = 4200

export type DraftFanReplyWithMimicResult =
  | { ok: true; pending?: false; text: string; note: string }
  | { ok: true; pending: true; jobId: string; note: string; text?: never }
  | { ok: false; error: string }

function formatOpenAiErrorResponse(status: number, bodyText: string): string {
  const raw = bodyText.trim()
  try {
    const j = JSON.parse(raw) as { error?: { message?: string } }
    const m = typeof j.error?.message === 'string' ? j.error.message : ''
    const lower = m.toLowerCase()
    if (
      lower.includes('quota') ||
      lower.includes('billing') ||
      lower.includes('insufficient_quota') ||
      (status === 429 && lower.includes('rate'))
    ) {
      return 'OpenAI quota or billing limit reached for this app. Ask your admin to check the OpenAI account billing and usage, or try again later.'
    }
    if (m) return m.length > 600 ? `${m.slice(0, 600)}…` : m
  } catch {
    // not JSON
  }
  if (status === 401 || status === 403) {
    return 'OpenAI rejected the API key (unauthorized). Check OPENAI_API_KEY on the server.'
  }
  return raw.length > 400 ? `${raw.slice(0, 400)}…` : raw
}

export async function draftFanReplyWithMimic(opts: {
  supabase: SupabaseClient
  userId: string
  fanId: string
  mimicRaw: unknown
}): Promise<DraftFanReplyWithMimicResult> {
  const mimic = parseMimicProfile(opts.mimicRaw) ?? DEFAULT_MIMIC_PROFILE

  if (!mimic.consentFanFacingDrafts) {
    return {
      ok: false,
      error:
        'Fan-facing drafts are off. Complete the Mimic Test on Divine Manager and enable “Allow fan-facing drafts”, or turn it on in Mimic settings.',
    }
  }

  // Mimic only needs the live thread + CRM/persona context — not the full DM reply package
  // (which runs Scan/Circe/Venus/Flirt in parallel and burns OpenAI quota before Mimic runs).
  const ctx = await loadOnlyFansMessagingContext(opts.supabase, opts.userId, { fanId: opts.fanId })
  if ('error' in ctx) {
    return { ok: false, error: ctx.error }
  }
  if (ctx.messages.length === 0) {
    return { ok: false, error: 'No messages in thread for this fan.' }
  }

  const threadCore = ctx.threadPreview || ''
  const supplement =
    typeof ctx.threadSupplement === 'string' && ctx.threadSupplement.trim()
      ? `\n\nContext notes:\n${ctx.threadSupplement.trim().slice(0, 2500)}`
      : ''
  const thread = `${threadCore.slice(0, 8000)}${supplement}`.slice(0, 10_000)

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'OPENAI_API_KEY is not configured.' }
  }

  const human = ['none', 'very rare small typos', 'occasional casual typos', 'more informal typos'][
    Math.min(3, Math.max(0, mimic.humanizationLevel ?? 1))
  ]

  const system = `You write a single reply message for a fan as if YOU are the creator, matching their voice.
Rules:
- Stay within the creator boundaries and taboo list; never violate banned phrases.
- Output ONLY the message text to send (no quotes, no preamble). Max ~600 characters unless thread needs more.
- Do not claim to be an AI in the message body.
- Humanization hint: ${human}.
- If "never send without review" is on, the app will still show this as a draft—the creator approves before sending.`

  const user = `Mimic profile (JSON):
${JSON.stringify(
  {
    toneWarmth: mimic.toneWarmth,
    flirtCeiling: mimic.flirtCeiling,
    humorLevel: mimic.humorLevel,
    tabooTopics: mimic.tabooTopics,
    bannedPhrases: mimic.bannedPhrases,
    signaturePhrases: mimic.signaturePhrases,
    exemplarReplies: (mimic.exemplarReplies ?? []).slice(0, 5),
    notes: mimic.notes,
  },
  null,
  2,
)}

Recent thread (newest context at end):
${thread.slice(0, 8000)}

Write one reply that fits the thread and the mimic profile.`

  const webhookSecret = process.env.OPENAI_WEBHOOK_SECRET?.trim()
  const totalChars = user.length + system.length
  if (webhookSecret && totalChars >= MIMIC_BG_MIN_CHARS) {
    const bg = await createOpenAiBackgroundJob({
      userId: opts.userId,
      feature: 'mimic_test',
      model: OPENAI_MODEL,
      instructions: system,
      input: user,
      requestMetadata: {
        fanId: opts.fanId,
        mimic_never_review: mimic.neverSendWithoutReview !== false,
      },
    })
    if (bg.ok && bg.jobId) {
      const baseNote =
        mimic.neverSendWithoutReview !== false
          ? 'Draft only—review before sending.'
          : 'Review recommended before sending.'
      return {
        ok: true,
        pending: true,
        jobId: bg.jobId,
        note: `${baseNote} Reply is composing in the background (job …${bg.jobId.slice(-8)}). Check Preferences → Background AI jobs or ask Divine for get_background_job.`,
      }
    }
    // Fallback to sync chat when queue fails or key missing downstream
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.75,
      max_tokens: 500,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })

  if (!res.ok) {
    const t = await res.text().catch(() => '')
    const detail = formatOpenAiErrorResponse(res.status, t)
    return { ok: false, error: `Draft failed: ${detail}` }
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const text = data.choices?.[0]?.message?.content?.trim() ?? ''
  if (!text) {
    return { ok: false, error: 'Empty draft from model.' }
  }

  const note = mimic.neverSendWithoutReview !== false
    ? 'Draft only—review before sending. Fan-facing AI drafts require your approval.'
    : 'Review recommended before sending.'

  return { ok: true, text, note }
}
