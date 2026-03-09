import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Lock } from 'lucide-react'
import { RevenuePrivacySwitch } from '@/components/settings/revenue-privacy-switch'
import { BillingActions } from '@/components/settings/billing-actions'

export default function SecuritySettingsPage() {
  return (
    <>
      <Card variant="brand" className="border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy
          </CardTitle>
          <CardDescription>
            Control visibility of sensitive financial information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RevenuePrivacySwitch />
        </CardContent>
      </Card>

      <Card variant="brand" className="border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Payment & account security
          </CardTitle>
          <CardDescription>
            Payment data is secured by Stripe. Update your card or view invoices in the billing portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BillingActions />
        </CardContent>
      </Card>
    </>
  )
}
