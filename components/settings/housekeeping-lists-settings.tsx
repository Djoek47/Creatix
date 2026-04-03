'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ListTree, Sparkles } from 'lucide-react'

/** Settings entry point: full Smart classify UI lives under /dashboard/fans/classify */
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
          Smart classify
        </CardTitle>
        <CardDescription>
          Auto-sync fans into OnlyFans lists and Fansly CRM tags from spend and activity. Configure segments, active
          chat lists, and see live activity on the Classify page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="secondary" className="gap-2">
          <Link href="/dashboard/fans/classify">
            <Sparkles className="h-4 w-4" />
            Open Smart classify
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
