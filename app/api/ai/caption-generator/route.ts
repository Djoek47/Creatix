import { NextRequest } from 'next/server'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { callGrokVision } from '@/lib/ai/grok-tools'
import { getCreditsForToolId } from '@/lib/billing/credit-economics'
import { consumeAiCredits } from '@/lib/billing/consume-ai-credits'
import { getBrandContext } from '@/lib/brand/get-brand-context'
import { evaluateBrandTextCompliance } from '@/lib/brand/brand-governance'

export const maxDuration = 60

const captionSchema = z.object({
  captions: z.array(
    z.object({
      text: z.string().describe('The caption text'),
      tone: z.enum(['teasing', 'playful', 'mysterious', 'confident', 'intimate']).describe('Caption tone'),
      length: z.enum(['short', 'medium', 'long']).describe('Caption length'),
    }),
  ),
  hashtags: z.array(z.string()).describe('Relevant hashtags'),
  teaserMessage: z.string().describe('Message to tease this content to fans'),
  ppvSalesCopy: z.string().describe('Sales copy for PPV unlock message'),
  bestPostingTime: z.string().describe('Recommended time to post'),
  targetAudience: z.string().describe('Who this content appeals to'),
  contentTips: z.array(z.string()).describe('Tips to maximize engagement'),
})

type CaptionOutput = z.infer<typeof captionSchema>

function buildSystemPrompt(
  platform: string,
  creatorNiche: string | undefined,
  creatorTone: string | undefined,
  hasImage: boolean,
  brandCompact?: string,
) {
  return `You are a social media expert specializing in adult content creator platforms (OnlyFans, Fansly, ManyVids).

Creator Profile:
- Niche: ${creatorNiche || 'General'}
- Preferred Tone: ${creatorTone || 'Flirty and engaging'}
- Platform: ${platform || 'OnlyFans'}

${hasImage ? 'You can SEE the uploaded image. Base captions, hashtags, and copy on what is actually visible (pose, setting, outfit, mood, lighting). Combine visual facts with any optional creator notes or voice transcript they provided.' : 'The creator described the content in text (they may also have used voice-to-text).'}

Generate captivating captions, hashtags, and sales copy that:
1. Maximize engagement and clicks
2. Create urgency and FOMO
3. Maintain the creator's authentic voice
4. Drive PPV sales and tips
5. Follow platform guidelines (no explicit language)

Keep suggestions tasteful but enticing - suggestive without being explicit.
${brandCompact ? `\nBrand context to follow:\n${brandCompact}` : ''}
`
}

function parseCaptionJson(raw: string): CaptionOutput {
  const cleaned = raw.trim().replace(/^```json\s*|\s*```$/g, '')
  const parsed = JSON.parse(cleaned) as unknown
  return captionSchema.parse(parsed)
}

async function runOpenAiCaption(opts: {
  systemPrompt: string
  userText: string
  imageDataUrl?: string
}): Promise<CaptionOutput> {
  const { systemPrompt, userText, imageDataUrl } = opts
  const userContent =
    imageDataUrl && imageDataUrl.startsWith('data:image/')
      ? ([
          { type: 'text' as const, text: userText },
          { type: 'image' as const, image: imageDataUrl },
        ] as const)
      : ([{ type: 'text' as const, text: userText }] as const)

  const { output } = await generateText({
    model: 'openai/gpt-4o-mini',
    output: Output.object({
      schema: captionSchema,
    }),
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [...userContent],
      },
    ],
  })
  return output
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const contentType = typeof body.contentType === 'string' ? body.contentType : 'photo'
  const contentDescription =
    typeof body.contentDescription === 'string' ? body.contentDescription.trim() : ''
  const platform = typeof body.platform === 'string' ? body.platform : 'onlyfans'
  const creatorNiche = typeof body.creatorNiche === 'string' ? body.creatorNiche.trim() : undefined
  const creatorTone = typeof body.creatorTone === 'string' ? body.creatorTone.trim() : undefined
  const imageRaw = typeof body.image === 'string' ? body.image.trim() : ''
  const hasImage = imageRaw.startsWith('data:image/')
  const hasText = contentDescription.length > 0

  if (!hasImage && !hasText) {
    return Response.json(
      {
        error:
          'Upload a photo or a short video (we use one frame), or describe your content — or use the mic to talk through what fans should feel.',
      },
      { status: 400 },
    )
  }

  if (hasImage && imageRaw.length > 6 * 1024 * 1024) {
    return Response.json({ error: 'Image is too large. Try a smaller file or let us compress in the browser.' }, { status: 400 })
  }

  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const brandContext = user ? await getBrandContext(supabase, user.id) : null
  const systemPrompt = buildSystemPrompt(platform, creatorNiche, creatorTone, hasImage, brandContext?.compact)

  const userText = hasImage
    ? `Content type: ${contentType}
Platform: ${platform}
${hasText ? `Creator notes / voice description:\n${contentDescription}\n` : ''}
Generate 3 caption variations (different tones/lengths), hashtags (no # in the array values), teaser message, PPV sales copy, best posting time, target audience, and content tips.`
    : `Generate captions and sales copy for this content:

Content Type: ${contentType || 'Photo'}
Description: ${contentDescription || 'New content'}

Generate 3 caption variations, hashtags, teaser message, and PPV sales copy.`

  const xaiKey = process.env.XAI_API_KEY

  if (hasImage && xaiKey) {
    try {
      const raw = await callGrokVision({
        apiKey: xaiKey,
        systemPrompt: `${systemPrompt}

Return ONLY valid JSON with this exact shape (no markdown fences):
{
  "captions": [ { "text": string, "tone": "teasing"|"playful"|"mysterious"|"confident"|"intimate", "length": "short"|"medium"|"long" } ],
  "hashtags": string[],
  "teaserMessage": string,
  "ppvSalesCopy": string,
  "bestPostingTime": string,
  "targetAudience": string,
  "contentTips": string[]
}`,
        userPrompt: userText,
        imageDataUrl: imageRaw,
        jsonMode: true,
      })
      const output = parseCaptionJson(raw)
      return await finalizeResponse(supabase, user?.id ?? null, output, brandContext?.full ?? null)
    } catch {
      // fall through to OpenAI vision
    }
  }

  try {
    const output = await runOpenAiCaption({
      systemPrompt,
      userText,
      imageDataUrl: hasImage ? imageRaw : undefined,
    })
    return await finalizeResponse(supabase, user?.id ?? null, output, brandContext?.full ?? null)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Caption generation failed'
    return Response.json({ error: message }, { status: 500 })
  }
}

async function finalizeResponse(
  supabase: Awaited<ReturnType<typeof createRouteHandlerClient>>,
  userId: string | null,
  output: CaptionOutput,
  brandProfile: Awaited<ReturnType<typeof getBrandContext>>['full'] | null,
) {
  const complianceText = [
    ...output.captions.map((c) => c.text),
    output.teaserMessage,
    output.ppvSalesCopy,
  ].join('\n')
  const compliance = evaluateBrandTextCompliance(brandProfile, complianceText)
  if (compliance.blocked) {
    return Response.json(
      { error: 'Output blocked by Brand Uniformity policy.', violations: compliance.violations },
      { status: 422 },
    )
  }

  try {
    if (userId) {
      await consumeAiCredits(supabase, userId, getCreditsForToolId('caption-generator'))
    }
  } catch {
    // ignore credit errors
  }

  return Response.json({
    ...output,
    brandWarnings: [...compliance.violations, ...compliance.warnings],
  })
}
