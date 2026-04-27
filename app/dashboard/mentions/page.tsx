import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Bell, ThumbsUp, Minus, ThumbsDown } from 'lucide-react'
import type { ReputationMention } from '@/lib/types'
import { MentionsHeader } from '@/components/dashboard/mentions-header'
import { MentionsListBody } from '@/components/dashboard/mentions-list-body'
import { MentionsConnectBanner } from '@/components/dashboard/mentions-connect-banner'
import { ReputationBriefingCard } from '@/components/dashboard/reputation-briefing-card'
import { ReputationIdentityCard } from '@/components/dashboard/reputation-identity-card'
import type { ReputationBriefingPayload } from '@/lib/reputation/briefing'

export default async function MentionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
        'reputation_briefing, reputation_briefing_at, reputation_manual_handles, reputation_display_name, reputation_platform_handles',
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
  const initialManualHandles =
    (profileRow as { reputation_manual_handles?: string[] | null } | null)?.reputation_manual_handles ?? []
  const initialDisplayName =
    (profileRow as { reputation_display_name?: string | null } | null)?.reputation_display_name ?? null

  const allMentions = (mentions || []) as ReputationMention[]
  const unreviewed = allMentions.filter(m => !m.is_reviewed)
  const reviewed = allMentions.filter(m => m.is_reviewed)

  const positiveCount = allMentions.filter(m => m.sentiment === 'positive').length
  const neutralCount = allMentions.filter(m => m.sentiment === 'neutral').length
  const negativeCount = allMentions.filter(m => m.sentiment === 'negative').length

  return (
    <div className="space-y-5 min-w-0">
      <MentionsHeader />

      <MentionsConnectBanner />

      <ReputationIdentityCard
        initialManualHandles={initialManualHandles}
        initialDisplayName={initialDisplayName}
        initialOnlyfans={initialOnlyfans}
      />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/30 sm:grid-cols-4">
        {[
          { label: 'To review', value: unreviewed.length, icon: Bell, iconClass: 'text-primary' },
          { label: 'Positive', value: positiveCount, icon: ThumbsUp, iconClass: 'text-chart-2' },
          { label: 'Neutral', value: neutralCount, icon: Minus, iconClass: 'text-muted-foreground' },
          { label: 'Negative', value: negativeCount, icon: ThumbsDown, iconClass: 'text-destructive' },
        ].map(({ label, value, icon: Icon, iconClass }) => (
          <Card key={label} className="rounded-none border-0 bg-card/90 shadow-none">
            <CardContent className="flex items-center gap-3 p-3 sm:p-4">
              <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} aria-hidden />
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="text-lg font-bold tabular-nums leading-none sm:text-xl">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
