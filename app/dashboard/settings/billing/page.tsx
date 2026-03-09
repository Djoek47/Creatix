import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard } from 'lucide-react'
import { BillingActions } from '@/components/settings/billing-actions'

export default function BillingSettingsPage() {
  return (
    <Card variant="brand" className="border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Billing & security
        </CardTitle>
        <CardDescription>
          Payment data is secured by Stripe. Manage your subscription, payment method, and invoices below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BillingActions />
      </CardContent>
    </Card>
  )
}
