import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import {
  chargeAiToolCreditsAfterSuccess,
  requireAiToolSessionAndCredits,
} from '@/lib/ai/assert-ai-tool-access'
import { getToolMeta, resolveCanonicalToolId } from '@/lib/ai-tools-data'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const toolId = typeof body.toolId === 'string' ? body.toolId : ''
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    if (!toolId || !prompt) {
      return NextResponse.json(
        { error: 'toolId and prompt are required' },
        { status: 400 },
      )
    }

    const canonical = resolveCanonicalToolId(toolId)
    const meta = getToolMeta(canonical)
    if (!meta) {
      return NextResponse.json({ error: 'Unknown tool id.' }, { status: 400 })
    }
    if (meta.comingSoon) {
      return NextResponse.json({ error: 'This tool is not available yet.' }, { status: 503 })
    }

    const access = await requireAiToolSessionAndCredits(req, canonical)
    if (!access.ok) return access.response

    const { supabase, userId, cost, billingToolId } = access.data

    if (canonical === 'commenter') {
      return NextResponse.json({
        content:
          'Commenter is a full web dashboard experience only. Open Dashboard → Commenter (/dashboard/commenter) in your browser to sync OnlyFans comments, review persona reply drafts, and see safety flags.',
      })
    }
    if (canonical === 'housekeeping') {
      return NextResponse.json({
        content:
          'Fan Atlas: Smart classify fans by spend, DM/thread activity, and freeloader segments — then sync to OnlyFans lists and Fansly tags. Open Dashboard → Commenter?section=housekeeping or Fans → Arrangements to configure housekeeping_lists; cron housekeeping-fan-lists applies changes.',
      })
    }

    const toolName = meta.name ?? canonical
    const toolDesc = meta.longDescription ?? meta.description ?? ''

    const { text } = await generateText({
      model: 'openai/gpt-4o-mini',
      system: `You are an expert AI assistant for the creator tool "${toolName}".
${toolDesc ? `Tool description: ${toolDesc}` : ''}
Respond with actionable, helpful output tailored to the creator's request. Be concise but complete. Use plain text or short bullet points where appropriate.`,
      prompt,
    })

    const charged = await chargeAiToolCreditsAfterSuccess(supabase, userId, cost, billingToolId)
    if (!charged.ok) return charged.response

    return NextResponse.json({ content: text })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tool run failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
