import { createClient } from '@/lib/supabase/server'
import { mapContentFromDbRows } from '@/lib/content/map-content-from-db'
import {
  onlyFansPartnerAccountIdFromRow,
  type PlatformConnectionObservedRow,
} from '@/lib/billing/onlyfans-billing-gate'
import { ConnectedPlatforms } from '@/components/dashboard/connected-platforms'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Moon } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Check for platform connections (OnlyFans “connected” must match API gate: usable partner account id)
  const { data: connections } = await supabase
    .from('platform_connections')
    .select(
      'platform, is_connected, last_sync_at, access_token, platform_user_id, observed_revenue_onlyfans_account_id',
    )
    .eq('user_id', user.id)
    .eq('is_connected', true)

  const onlyfansRow = (connections || []).find((c) => c.platform === 'onlyfans')
  const hasOnlyFansConnected =
    onlyFansPartnerAccountIdFromRow(onlyfansRow as PlatformConnectionObservedRow) != null

  const { data: analytics } = await supabase
    .from('analytics_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(30)

  const { data: contentRows } = await supabase
    .from('content')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(10)

  const content = mapContentFromDbRows(contentRows ?? [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ConnectedPlatforms />
          <Button
            asChild
            size="sm"
            variant="outline"
            className="hidden sm:inline-flex border-circe/40 text-circe-light hover:bg-circe/10"
          >
            <Link href="/dashboard/retention/churn">
              <Moon className="mr-1 h-4 w-4" />
              Churn Predictor
            </Link>
          </Button>
        </div>
      </div>

      <AnalyticsDashboard
        analytics={(analytics as any) || []}
        connections={(connections as any) || []}
        content={content}
        hasOnlyFansConnected={hasOnlyFansConnected}
      />
    </div>
  )
}
