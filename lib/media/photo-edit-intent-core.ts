import { generateText, Output } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { applySafePhotoEdit, parseDataUrl } from '@/lib/media/apply-safe-photo-edit'

const intentSchema = z.object({
  operation: z.enum(['blur', 'lighting', 'emoji']).describe('Only these three are allowed'),
  sigma: z.number().min(0.3).max(40).optional().describe('Blur strength for blur operation'),
  brightness: z.number().min(0.65).max(1.35).optional().describe('Brightness multiplier for lighting'),
  emoji: z.string().min(1).max(8).optional().describe('Single emoji or short emoji cluster for overlay'),
  xPercent: z.number().min(0).max(100).optional().describe('Horizontal position of emoji, 0=left 100=right'),
  yPercent: z.number().min(0).max(100).optional().describe('Vertical position of emoji, 0=top 100=bottom'),
  sizePercent: z.number().min(3).max(40).optional().describe('Emoji size as percent of min dimension'),
  explanation: z.string().describe('Brief friendly line about what you applied'),
})

export type PhotoEditIntentSuccess = {
  imageBase64: string
  operation: string
  explanation: string
  creditsUsed: number
}

function buildSystemPrompt(): string {
  return `You map a creator's natural-language request to ONE safe photo operation for adult-platform content.

You can ONLY choose:
- blur: Gaussian blur (privacy, softening background — never for "beautify face")
- lighting: adjust brightness only (modulate brightness ~0.65–1.35), no HDR fake skin
- emoji: overlay one emoji (or short cluster) at a position on the image

FORBIDDEN (never output these as operations; refuse by choosing the closest safe option and explain):
- Face beautify, skin smoothing, body reshaping, inpainting, removing clothes, replacing backgrounds with AI, adding/removing people, text overlays except emoji, video.

Use the image to infer placement for emoji (e.g. "corner" → high x/y toward that corner). Default blur sigma ~10, brightness ~1.08, emoji ~50% x and 18–22% y from top unless user specifies.

If the request is ambiguous, pick a reasonable safe interpretation. If impossible safely, use lighting with brightness 1.0 and explain you kept the image unchanged aside from a neutral pass.`
}

export async function executePhotoEditIntent(opts: {
  imageBase64: string
  instruction: string
  userId: string
  supabase: SupabaseClient
}): Promise<
  | { ok: true; data: PhotoEditIntentSuccess }
  | { ok: false; error: string; status: number }
> {
  const imageBase64 = opts.imageBase64.trim()
  const instruction = opts.instruction.trim()

  if (!imageBase64.startsWith('data:image/')) {
    return { ok: false, error: 'imageBase64 (data URL) is required', status: 400 }
  }
  if (!instruction || instruction.length < 2) {
    return { ok: false, error: 'instruction is required', status: 400 }
  }
  if (instruction.length > 4000) {
    return { ok: false, error: 'instruction too long', status: 400 }
  }

  const parsedImg = parseDataUrl(imageBase64)
  if ('error' in parsedImg) {
    return { ok: false, error: parsedImg.error, status: 400 }
  }

  const { data: subscription } = await opts.supabase
    .from('subscriptions')
    .select('ai_credits_used, ai_credits_limit')
    .eq('user_id', opts.userId)
    .maybeSingle()

  const used = (subscription as { ai_credits_used?: number } | null)?.ai_credits_used ?? 0
  const limit = (subscription as { ai_credits_limit?: number } | null)?.ai_credits_limit ?? 100
  if (limit < 999999 && used >= limit) {
    return { ok: false, error: 'AI credits exhausted', status: 402 }
  }

  const userText = `Creator request (may be from voice): "${instruction}"

Return structured fields for exactly one safe operation.`

  let intent: z.infer<typeof intentSchema>
  try {
    const { output } = await generateText({
      model: 'openai/gpt-4o-mini',
      output: Output.object({ schema: intentSchema }),
      system: buildSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: userText },
            { type: 'image', image: imageBase64 },
          ],
        },
      ],
    })
    intent = output
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Vision intent failed'
    return { ok: false, error: msg, status: 502 }
  }

  let editBody: Parameters<typeof applySafePhotoEdit>[0]
  if (intent.operation === 'blur') {
    editBody = {
      operation: 'blur',
      imageBase64,
      sigma: intent.sigma ?? 10,
    }
  } else if (intent.operation === 'lighting') {
    editBody = {
      operation: 'lighting',
      imageBase64,
      brightness: intent.brightness ?? 1.08,
    }
  } else {
    const emoji = (intent.emoji ?? '✨').slice(0, 8)
    editBody = {
      operation: 'emoji',
      imageBase64,
      emoji,
      xPercent: intent.xPercent ?? 50,
      yPercent: intent.yPercent ?? 20,
      sizePercent: intent.sizePercent ?? 14,
    }
  }

  const out = await applySafePhotoEdit(editBody)
  if ('error' in out) {
    return { ok: false, error: out.error, status: 500 }
  }

  if (limit < 999999) {
    await opts.supabase
      .from('subscriptions')
      .update({ ai_credits_used: used + 1 })
      .eq('user_id', opts.userId)
  }

  return {
    ok: true,
    data: {
      imageBase64: out.imageBase64,
      operation: intent.operation,
      explanation: intent.explanation,
      creditsUsed: limit < 999999 ? used + 1 : used,
    },
  }
}
