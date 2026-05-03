import { NextRequest, NextResponse, after } from 'next/server'
import OpenAI from 'openai'
import { processParsedOpenAiWebhook } from '@/lib/openai/webhook-processor'

export const runtime = 'nodejs'

/** OpenAI webhook: verify quickly, offload work via `after()`, return 200. */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const secret = process.env.OPENAI_WEBHOOK_SECRET?.trim()
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!secret || !apiKey) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  let event: Record<string, unknown>
  try {
    const client = new OpenAI({ apiKey, webhookSecret: secret })
    const hdr = Object.fromEntries(req.headers.entries())
    event = (await client.webhooks.unwrap(rawBody, hdr)) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  after(() =>
    void processParsedOpenAiWebhook({
      event,
      rawBody,
      headers: req.headers,
    }),
  )

  return NextResponse.json({ ok: true })
}
