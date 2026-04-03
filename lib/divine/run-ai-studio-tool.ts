/**
 * Run AI Studio tools by id + args (same routes as the dashboard library; uses session cookie).
 */
import { getToolMeta } from '@/lib/ai-tools-data'
import { runDivineAiToolServer, isDivineAiToolId, type DivineAiToolId } from '@/lib/divine/run-ai-tool-core'

/** Build a prompt for /api/ai/tool-run when no dedicated API mapping exists. */
function buildGenericToolRunPrompt(a: Record<string, unknown>): string {
  const lines: string[] = []
  const push = (label: string, v: unknown) => {
    if (typeof v === 'string' && v.trim()) lines.push(`${label}: ${v.trim()}`)
  }
  push('Request', a.prompt)
  push('Description', a.description)
  push('Content', a.contentDescription)
  push('Message', a.message)
  push('Text', a.text)
  push('Context', a.context)
  push('Scenario', a.scenario)
  push('Niche', a.niche)
  if (a.platform != null && String(a.platform).trim()) lines.push(`Platform: ${String(a.platform).trim()}`)
  push('Goals', a.goals)
  push('Fan info', a.fanInfo)
  push('Goal', a.goal)
  if (typeof a.fanId === 'string' && a.fanId.trim()) lines.push(`fanId: ${a.fanId.trim()}`)
  push('Budget', a.budget)
  if (typeof a.competitorTargets === 'string' && a.competitorTargets.trim()) {
    lines.push(`Competitor targets / handles: ${a.competitorTargets.trim()}`)
  }
  if (typeof a.useWishlist === 'boolean') lines.push(`useWishlist: ${a.useWishlist}`)
  if (typeof a.useWebSearch === 'boolean') lines.push(`useWebSearch: ${a.useWebSearch}`)
  return lines.join('\n')
}

function apiBase(): string {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return baseUrl + '/api/ai'
}

export type RunAiStudioToolResult = { success: true; result: unknown } | { success: false; error: string }

/**
 * POST JSON to /api/ai/:path with cookie auth.
 */
async function postAi(
  path: string,
  body: Record<string, unknown>,
  cookie: string,
): Promise<RunAiStudioToolResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Cookie: cookie,
  }
  const res = await fetch(`${apiBase()}/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { success: false, error: (data as { error?: string }).error || `HTTP ${res.status}` }
  return { success: true, result: data }
}

/**
 * Maps tool id (ai-tools-data) to API subpath and body builder from generic args.
 */
export async function runAiStudioToolServer(
  toolId: string,
  args: Record<string, unknown>,
  cookie: string,
): Promise<RunAiStudioToolResult> {
  const meta = getToolMeta(toolId)
  if (!meta) {
    return { success: false, error: `Unknown tool id: ${toolId}` }
  }
  if (!meta.hasRunner) {
    return {
      success: false,
      error: `Tool "${meta.name}" has no API runner in AI Studio. Use a listed tool id with hasRunner.`,
    }
  }
  const a = args ?? {}

  if (toolId === 'commenter') {
    return {
      success: true,
      result: {
        content:
          'Commenter runs in the web dashboard only: open Dashboard → Commenter (/dashboard/commenter) to sync OnlyFans comments, review AI persona reply drafts (Circe / Venus / Flirt / Professional), and see safety flags. Nothing to execute from this API — use the Commenter page or Divine tools like sync_commenter_from_posts.',
      },
    }
  }

  if (isDivineAiToolId(toolId)) {
    return runDivineAiToolServer(toolId as DivineAiToolId, a, cookie)
  }

  switch (toolId) {
    case 'fantasy-writer':
      return postAi('fantasy-writer', {
        scenario: a.scenario ?? a.contentDescription ?? a.description ?? '',
        tone: a.tone ?? a.contentType ?? 'romantic',
        platform: a.platform ?? 'onlyfans',
        calendarEventSummary: typeof a.calendarEventSummary === 'string' ? a.calendarEventSummary : undefined,
        scheduledContentSummary: typeof a.scheduledContentSummary === 'string' ? a.scheduledContentSummary : undefined,
        fanProfileSummary: typeof a.fanProfileSummary === 'string' ? a.fanProfileSummary : undefined,
      }, cookie)
    case 'gift-suggester':
      return postAi('gift-suggester', {
        fanInfo: a.fanInfo ?? a.message ?? '',
        budget: a.budget ?? a.currentPrice ?? '',
        useWishlist: a.useWishlist === true,
      }, cookie)
    case 'price-optimizer':
      return postAi('revenue-optimizer', {
        currentPrice: a.currentPrice ?? '',
        contentType: a.contentType ?? 'photo',
        platform: a.platform ?? 'onlyfans',
        description: a.description ?? a.contentDescription ?? '',
      }, cookie)
    case 'dm-bundle-pricing':
      return postAi('dm-bundle-pricing', {
        goal: a.goal ?? '',
        fan_context: a.fan_context ?? a.fanContext ?? '',
        fan_access_context: a.fan_access_context ?? a.fanAccessContext ?? '',
        content_summary: a.content_summary ?? a.contentSummary ?? '',
        pricing_style: a.pricing_style ?? a.pricingStyle ?? 'balanced',
        pricing_bias: a.pricing_bias ?? a.pricingBias ?? '',
        platform: a.platform ?? 'onlyfans',
        current_price: typeof a.current_price === 'number' ? a.current_price : a.currentPrice,
      }, cookie)
    case 'voice-cloning':
      return postAi('voice-clone', {
        sampleText: a.sampleText ?? '',
        targetTone: a.targetTone ?? a.contentType ?? 'natural',
        context: a.context ?? a.description ?? '',
      }, cookie)
    case 'pricing-optimizer':
      return postAi('pricing-optimizer', {
        contentType: a.contentType ?? 'photo',
        currentPrice: a.currentPrice ?? '',
        niche: a.niche ?? '',
        subscriberCount: a.subscriberCount ?? a.fanMessage ?? '',
      }, cookie)
    case 'mass-dm-composer':
      return postAi('mass-dm-composer', {
        campaign: a.campaign ?? a.campaignGoal ?? '',
        audienceSegment: a.audienceSegment ?? 'all',
        tone: a.tone ?? a.contentType ?? 'friendly',
        callToAction: a.callToAction ?? a.description ?? '',
      }, cookie)
    case 'venus-attraction':
      return postAi('venus-attraction', {
        prompt: a.prompt ?? a.description ?? a.contentDescription ?? '',
        niche: a.niche ?? '',
        platform: a.platform ?? 'onlyfans',
      }, cookie)
    case 'venus-cupid':
      return postAi('venus-cupid', {
        prompt: a.prompt ?? a.description ?? '',
        niche: a.niche ?? '',
      }, cookie)
    case 'venus-garden':
      return postAi('venus-garden', {
        prompt: a.prompt ?? a.description ?? '',
        niche: a.niche ?? '',
      }, cookie)
    case 'circe-oracle':
      return postAi('circe-oracle', {
        prompt: a.prompt ?? a.description ?? '',
        niche: a.niche ?? '',
      }, cookie)
    case 'circe-transformation':
      return postAi('circe-transformation', {
        prompt: a.prompt ?? a.description ?? '',
        niche: a.niche ?? '',
      }, cookie)
    case 'divine-forecast':
      return postAi('tool-run', {
        toolId: 'divine-forecast',
        prompt: typeof a.prompt === 'string' && a.prompt.trim()
          ? a.prompt
          : 'Revenue and growth forecast for my creator business.',
      }, cookie)
    case 'video-script-ai': {
      const parts = [
        typeof a.niche === 'string' && a.niche.trim() && `Niche / persona: ${a.niche.trim()}`,
        a.platform && `Platform: ${String(a.platform)}`,
        a.scriptLength && `Target length: ${String(a.scriptLength)}`,
        typeof a.prompt === 'string'
          ? a.prompt
          : typeof a.contentDescription === 'string'
            ? a.contentDescription
            : typeof a.description === 'string'
              ? a.description
              : '',
      ].filter(Boolean) as string[]
      const prompt =
        parts.join('\n').trim() ||
        'Write a short vertical video script with a strong hook, 3–5 story beats, suggested on-screen text, and a clear CTA for subscribers.'
      return postAi('tool-run', { toolId: 'video-script-ai', prompt }, cookie)
    }
    case 'competitor-analysis':
      return postAi(
        'competitor-analysis',
        {
          niche: typeof a.niche === 'string' ? a.niche : '',
          platform: typeof a.platform === 'string' ? a.platform : 'onlyfans',
          competitorTargets: typeof a.competitorTargets === 'string' ? a.competitorTargets : '',
          goals:
            typeof a.prompt === 'string'
              ? a.prompt
              : typeof a.contentDescription === 'string'
                ? a.contentDescription
                : typeof a.description === 'string'
                  ? a.description
                  : '',
          useWebSearch: a.useWebSearch !== false,
        },
        cookie,
      )
    default: {
      const fromArgs = buildGenericToolRunPrompt(a).trim()
      const fallback = `The creator is using Divine Manager. Help them with "${meta.name}" (${meta.description}). Give concrete, actionable output they can use today.`
      return postAi('tool-run', { toolId, prompt: fromArgs || fallback }, cookie)
    }
  }
}
