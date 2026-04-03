import { generateText, Output } from 'ai'
import { z } from 'zod'

const commentAnalysisSchema = z.object({
  sentiment: z.enum(['positive', 'neutral', 'negative', 'mixed']),
  connotation_tags: z.array(z.string()).describe('Short tags e.g. supportive, jealous, thirsty, troll'),
  inferred_signals: z
    .array(z.string())
    .describe('CRM hints: interests, dynamics, discomfort themes (tasteful labels, no graphic sex)'),
  jealousy_or_discomfort: z.boolean(),
  discomfort_notes: z.string().optional(),
  safety_level: z.enum(['low', 'medium', 'high', 'critical']),
  stalking_signals: z.array(z.string()).describe('Red flags: obsession, threats, doxxing hints, repeated boundary violations'),
  recommended_action: z.enum(['reply', 'ignore', 'block_review']),
  engagement_angle: z.string().describe('One line: how to monetize or bond without being generic'),
  fan_profile_delta: z.object({
    signals_from_comments: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }),
  replies: z.object({
    circe: z.string().describe('Retention / emotional pull, subtle upsell ok'),
    venus: z.string().describe('Growth: flirt + gentle tip/PPV angle'),
    flirt: z.string().describe('Pure chemistry, no business talk'),
    professional: z.string().describe('Warm but neutral; safe for mixed public thread'),
    best_pick: z.enum(['circe', 'venus', 'flirt', 'professional']),
    best_reply: z.string(),
    best_rationale: z.string(),
  }),
})

export type CommentAnalysisOutput = z.infer<typeof commentAnalysisSchema>

export async function analyzePostCommentWithAi(opts: {
  commentText: string
  source: 'post' | 'story' | 'stream'
  platformPostId: string
  fanUsername: string | null
  fanDisplayName: string | null
  threadProfileExcerpt: string | null
  creatorPersonaExcerpt: string | null
  salesIntensity: 'standard' | 'bold'
  /** Free vs paid follower + sub status (from CRM). */
  fanCommerceLine?: string | null
  /** Post paywall / comment-without-unlock context. */
  postAccessLine?: string | null
}): Promise<CommentAnalysisOutput> {
  const intensity =
    opts.salesIntensity === 'bold'
      ? 'Creator opted into bolder public-thread engagement: you may use strong tease and findom/cuck-adjacent framing ONLY if the comment clearly invites that dynamic; still no hate, minors, non-consent, or illegal content.'
      : 'Keep public replies spicy-but-platform-safe; suggestive not graphic; no slurs; respect boundaries.'

  const { output } = await generateText({
    model: 'openai/gpt-4o-mini',
    output: Output.object({ schema: commentAnalysisSchema }),
    system: `You help adult creators triage and reply to public comments (posts/stories/streams).
${intensity}
Platform facts: fans may be on a free subscription tier ($0) or a paid tier; do not assume they see paywalled feed posts.
They can often comment on posts they have not unlocked or purchased (PPV)—do not assume they viewed the media.
Never instruct to break platform ToS. Outputs are drafts for the creator to review—they are not sent automatically.
If the fan seems dangerous (stalking, threats, coercion), set safety_level high/critical and recommended_action block_review with concise stalking_signals.`,
    messages: [
      {
        role: 'user',
        content: `Comment source: ${opts.source}
Post/content id: ${opts.platformPostId}
Fan: @${opts.fanUsername || 'unknown'} (${opts.fanDisplayName || 'unknown'})

Fan subscription / access (CRM snapshot, may be incomplete):
${(opts.fanCommerceLine || '(not available)').slice(0, 1200)}

Post / comment context:
${(opts.postAccessLine || '(not available)').slice(0, 1200)}

Comment text:
"""
${opts.commentText.slice(0, 4000)}
"""

Known thread/personality excerpt (may be empty):
${(opts.threadProfileExcerpt || '(none)').slice(0, 6000)}

Creator persona / boundaries notes (may be empty):
${(opts.creatorPersonaExcerpt || '(none)').slice(0, 2000)}

Produce structured analysis and five reply variants (circe, venus, flirt, professional) plus best_pick and best_reply copied from the chosen variant.`,
      },
    ],
  })

  return output
}
