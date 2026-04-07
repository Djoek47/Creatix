'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ListTree, Sparkles } from 'lucide-react'

/** Settings entry point: full UI lives under Fans → Arrangements. */
export function HousekeepingListsSettings({
  fanPlatformConnected,
}: {
  fanPlatformConnected: boolean
}) {
  if (!fanPlatformConnected) return null

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ListTree className="h-5 w-5" />
          Arrangements (smart lists)
        </CardTitle>
        <CardDescription>
          Smart classify: segment fans by spend, DM/thread activity, cold engagement, and freeloader buckets — then sync
          to OnlyFans lists and Fansly tags. Configure segments and active-chat lists under Fans → Arrangements.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="secondary" className="gap-2">
          <Link href="/dashboard/fans#arrangements">
            <Sparkles className="h-4 w-4" />
            Open Arrangements
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
