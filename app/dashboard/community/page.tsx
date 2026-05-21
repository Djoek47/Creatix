import { CommunityTipsFeed } from '@/components/community/community-tips-feed'
import { CirceDailyPromo } from '@/components/community/circe-daily-promo'
import { Badge } from '@/components/ui/badge'
import { LOCK_COMMUNITY_TIPS_FOR_BETA } from '@/lib/community/community-beta'

/** Creator-submitted tips & workflows—reviewed in the admin approvals queue. */
export default function CommunityPage() {
  return (
    <div className="space-y-8 p-4 pb-12 sm:p-6">
      <h1 className="sr-only">Suggestions</h1>
      <CirceDailyPromo />
      {LOCK_COMMUNITY_TIPS_FOR_BETA ? (
        <div className="relative">
          <div className="pointer-events-none select-none opacity-[0.42] saturate-[0.65]">
            <CommunityTipsFeed />
          </div>
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background/65 p-6 text-center backdrop-blur-sm"
            role="status"
            aria-live="polite"
          >
            <Badge variant="secondary" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200">
              Beta
            </Badge>
            <p className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Coming soon</p>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Submitted suggestions aren&apos;t here yet. <span className="text-foreground/90">Circe daily</span> above stays
              open—read today&apos;s tip and open the full archive anytime.
            </p>
          </div>
        </div>
      ) : (
        <CommunityTipsFeed />
      )}
    </div>
  )
}
