import { adminCommunityTipsQueue, adminOverviewExtended } from '@/lib/admin/queries'
import { CommunityModerationTable } from '@/components/admin/community-moderation-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = { searchParams?: Promise<{ status?: string }> }

export default async function AdminCommunityPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {}
  const statusRaw = typeof sp.status === 'string' ? sp.status : 'pending'
  const status =
    statusRaw === 'approved' || statusRaw === 'rejected' || statusRaw === 'all'
      ? statusRaw
      : 'pending'

  const [rows, overview] = await Promise.all([
    adminCommunityTipsQueue({ status: 'all', limit: 240 }),
    adminOverviewExtended(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Community approvals</h1>
        <p className="text-sm text-muted-foreground">
          Review creator-submitted community tips and decide what gets published to the community feed.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-amber-500/35 bg-amber-500/10">
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{overview.communityTipCounts.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-emerald-500/35 bg-emerald-500/10">
          <CardHeader className="pb-2">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{overview.communityTipCounts.approved}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-red-500/35 bg-red-500/10">
          <CardHeader className="pb-2">
            <CardDescription>Rejected</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{overview.communityTipCounts.rejected}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Moderation queue</CardTitle>
          <CardDescription>
            Approve publishes immediately to `/dashboard/community`. Reject keeps the submission private to its author.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CommunityModerationTable initialRows={rows} initialStatus={status} />
        </CardContent>
      </Card>
    </div>
  )
}
