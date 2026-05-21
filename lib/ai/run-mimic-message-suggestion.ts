import type { SupabaseClient } from '@supabase/supabase-js'
import type { MessageSuggestion } from '@/lib/ai/message-suggestions'
import { draftFanReplyWithMimic } from '@/lib/divine/draft-fan-reply'

type RunMimicMessageSuggestionParams = {
  supabase: SupabaseClient
  userId: string
  fanId: string
}

type RunMimicMessageSuggestionResult =
  | { ok: true; suggestions: MessageSuggestion[]; note?: string }
  | { ok: false; error: string }

export async function runMimicMessageSuggestion({
  supabase,
  userId,
  fanId,
}: RunMimicMessageSuggestionParams): Promise<RunMimicMessageSuggestionResult> {
  const { data: settings } = await supabase
    .from('divine_manager_settings')
    .select('mimic_profile')
    .eq('user_id', userId)
    .maybeSingle()

  const result = await draftFanReplyWithMimic({
    supabase,
    userId,
    fanId,
    mimicRaw: (settings as { mimic_profile?: unknown } | null)?.mimic_profile,
  })

  if (!result.ok) {
    return { ok: false, error: result.error }
  }

  if ('pending' in result && result.pending) {
    return {
      ok: true,
      suggestions: [],
      note: `${result.note} Job id: ${result.jobId}.`,
    }
  }

  return {
    ok: true,
    suggestions: [
      {
        id: `mimic-${Date.now()}`,
        text: result.text,
        goal: 'warmup',
        spiceLevel: 'medium',
      },
    ],
    note: result.note,
  }
}
