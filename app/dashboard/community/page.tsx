import { CommunityHero } from '@/components/community/community-hero'
import { CommunityTipsFeed } from '@/components/community/community-tips-feed'

/** Creatix community — curated tips, Circe daily, and creator contributions (reviewed). */
export default function CommunityPage() {
  return (
    <div className="min-w-0">
      <CommunityHero />
      <div className="px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
        <CommunityTipsFeed />
      </div>
    </div>
  )
}
