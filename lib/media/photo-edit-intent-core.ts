import { generateText, Output } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { applySafePhotoEdit, parseDataUrl } from '@/lib/media/apply-safe-photo-edit'
import { getCreditsForToolId } from '@/lib/billing/credit-economics'
import { consumeAiCredits, hasEnoughAiCredits } from '@/lib/billing/consume-ai-credits'

/**
 * OpenAI structured outputs (strict) require every `properties` key in `required`.
 * Use nullable (not optional) for fields that only apply to some operations.
 */
const intentSchema = z.object({
  operation: z.enum(['blur', 'lighting', 'emoji']).describe('Only these three are allowed'),
  sigma: z
    .number()
    .min(0.3)
    .max(40)
    .nullable()
    .describe('Blur strength when operation is blur; null otherwise'),
  brightness: z
    .number()
    .min(0.65)
    .max(1.35)
    .nullable()
    .describe('Brightness when operation is lighting; null otherwise'),
  emoji: z
    .string()
    .min(1)
    .max(8)
    .nullable()
    .describe('Emoji when operation is emoji; null otherwise'),
  xPercent: z
    .number()
    .min(0)
    .max(100)
    .nullable()
    .describe('Emoji X position; null when not emoji'),
  yPercent: z
    .number()
    .min(0)
    .max(100)
    .nullable()
    .describe('Emoji Y position; null when not emoji'),
  sizePercent: z
    .number()
    .min(3)
    .max(40)
    .nullable()
    .describe('Emoji size; null when not emoji'),
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

  const photoCost = getCreditsForToolId('photo-enhancer')
  const gate = await hasEnoughAiCredits(opts.supabase, opts.userId, photoCost)
  if (!gate.ok) {
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
      sigma: intent.sigma != null ? intent.sigma : 10,
    }
  } else if (intent.operation === 'lighting') {
    editBody = {
      operation: 'lighting',
      imageBase64,
      brightness: intent.brightness != null ? intent.brightness : 1.08,
    }
  } else {
    const emoji = (intent.emoji != null ? intent.emoji : '✨').slice(0, 8)
    editBody = {
      operation: 'emoji',
      imageBase64,
      emoji,
      xPercent: intent.xPercent != null ? intent.xPercent : 50,
      yPercent: intent.yPercent != null ? intent.yPercent : 20,
      sizePercent: intent.sizePercent != null ? intent.sizePercent : 14,
    }
  }

  const out = await applySafePhotoEdit(editBody)
  if ('error' in out) {
    return { ok: false, error: out.error, status: 500 }
  }

  const consumed = await consumeAiCredits(opts.supabase, opts.userId, photoCost)
  if (!consumed.ok) {
    return { ok: false, error: 'AI credits exhausted', status: 402 }
  }

  return {
    ok: true,
    data: {
      imageBase64: out.imageBase64,
      operation: intent.operation,
      explanation: intent.explanation,
      creditsUsed: consumed.usedAfter,
    },
  }
}
