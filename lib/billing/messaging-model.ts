import type { SupabaseClient } from '@supabase/supabase-js'
import { getDivineVoicePremiumForUserId } from '@/lib/billing/premium-divine'

/**
 * OpenAI (via Vercel AI Gateway) model for Circe / Venus / Flirt / message-suggestions.
 * Premium: stronger model. Non-premium: cost-controlled mini.
 */
export async function getOpenAiGatewayMessagingModelId(
  supabase: SupabaseClient,
  userId: string,
): Promise<'openai/gpt-4o' | 'openai/gpt-4o-mini'> {
  const premium = await getDivineVoicePremiumForUserId(supabase, userId)
  return premium ? 'openai/gpt-4o' : 'openai/gpt-4o-mini'
}
