import { createClient } from '@/lib/supabase/server'
import { Bell, ThumbsUp, Minus, ThumbsDown } from 'lucide-react'
import type { ReputationMention } from '@/lib/types'
import { MentionsHeader } from '@/components/dashboard/mentions-header'
import { MentionsListBody } from '@/components/dashboard/mentions-list-body'
import { MentionsConnectBanner } from '@/components/dashboard/mentions-connect-banner'
import { ReputationBriefingCard } from '@/components/dashboard/reputation-briefing-card'
import { ReputationIdentityCard } from '@/components/dashboard/reputation-identity-card'
import type { ReputationBriefingPayload } from '@/lib/reputation/briefing'
import { cn } from '@/lib/utils'

export default async function MentionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [{ data: mentions }, { data: profileRow }] = await Promise.all([
    supabase
      .from('reputation_mentions')
      .select('*')
      .eq('user_id', user.id)
      .order('detected_at', { ascending: false }),
    supabase
      .from('profiles')
      .select(
        'reputation_briefing, reputation_briefing_at, reputation_manual_handles, reputation_display_name, reputation_platform_handles, former_usernames',
      )
      .eq('id', user.id)
      .maybeSingle(),
  ])

  const briefingJson = (profileRow as { reputation_briefing?: unknown; reputation_briefing_at?: string | null } | null)
    ?.reputation_briefing
  const initialBriefing =
    briefingJson && typeof briefingJson === 'object' && briefingJson !== null && 'headline' in briefingJson
      ? (briefingJson as ReputationBriefingPayload)
      : null
  const briefingAt = (profileRow as { reputation_briefing_at?: string | null } | null)?.reputation_briefing_at ?? null

  const plat = (profileRow as { reputation_platform_handles?: Record<string, string> | null } | null)
    ?.reputation_platform_handles
  const initialOnlyfans = plat?.onlyfans ?? ''
  const initialFansly = plat?.fansly ?? ''
  const initialManualHandles =
    (profileRow as { reputation_manual_handles?: string[] | null } | null)?.reputation_manual_handles ?? []
  const initialDisplayName =
    (profileRow as { reputation_display_name?: string | null } | null)?.reputation_display_name ?? null
  const initialFormerUsernames =
    (profileRow as { former_usernames?: string[] | null } | null)?.former_usernames?.filter(Boolean) ?? []

  const allMentions = (mentions || []) as ReputationMention[]
  const unreviewed = allMentions.filter((m) => !m.is_reviewed)
  const reviewed = allMentions.filter((m) => m.is_reviewed)

  const positiveCount = allMentions.filter((m) => m.sentiment === 'positive').length
  const neutralCount = allMentions.filter((m) => m.sentiment === 'neutral').length
  const negativeCount = allMentions.filter((m) => m.sentiment === 'negative').length

  const statItems = [
    { label: 'To review', value: unreviewed.length, icon: Bell, tone: 'text-foreground' as const },
    { label: 'Positive', value: positiveCount, icon: ThumbsUp, tone: 'text-emerald-600 dark:text-emerald-400' as const },
    { label: 'Neutral', value: neutralCount, icon: Minus, tone: 'text-muted-foreground' as const },
    { label: 'Negative', value: negativeCount, icon: ThumbsDown, tone: 'text-destructive' as const },
  ]

  return (
    <div className="mx-auto min-w-0 max-w-4xl space-y-10 sm:space-y-12">
      <MentionsHeader />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground/85">
        <MentionsConnectBanner />
      </div>

      <ReputationIdentityCard
        initialManualHandles={initialManualHandles}
        initialDisplayName={initialDisplayName}
        initialOnlyfans={initialOnlyfans}
        initialFansly={initialFansly}
        initialFormerUsernames={initialFormerUsernames}
      />

      <section aria-label="Mention counts">
        <div className="grid grid-cols-2 divide-x divide-border/40 rounded-2xl border border-border/50 bg-muted/10 sm:grid-cols-4 dark:bg-muted/5">
          {statItems.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-4 sm:px-5 sm:py-5">
              <Icon className={cn('h-4 w-4 shrink-0 opacity-80', tone)} aria-hidden />
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/75">{label}</p>
                <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ReputationBriefingCard
        initialBriefing={initialBriefing}
        briefingAt={briefingAt}
        mentionCount={allMentions.length}
      />

      <MentionsListBody
        unreviewed={unreviewed}
        reviewed={reviewed}
        totalMentionCount={allMentions.length}
        hasBriefing={Boolean(initialBriefing)}
      />
    </div>
  )
}
