'use client'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useRevenuePrivacy } from '@/lib/revenue-privacy-context'
import { Eye, EyeOff } from 'lucide-react'

export function RevenuePrivacySwitch() {
  const { hideRevenue, setHideRevenue } = useRevenuePrivacy()

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {hideRevenue ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
        <div>
          <p className="font-medium">Hide revenue amounts</p>
          <p className="text-sm text-muted-foreground">
            Mask dollar amounts like a crypto wallet for privacy
          </p>
        </div>
      </div>
      <Switch checked={hideRevenue} onCheckedChange={setHideRevenue} />
    </div>
  )
}
