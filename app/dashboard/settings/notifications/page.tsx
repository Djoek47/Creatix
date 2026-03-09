import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Bell } from 'lucide-react'

const preferences = [
  { label: 'Email Notifications', description: 'Receive email updates about your account', defaultChecked: true },
  { label: 'Leak Alerts', description: 'Get notified when leaked content is detected', defaultChecked: true },
  { label: 'Reputation Alerts', description: 'Get notified about new mentions', defaultChecked: true },
  { label: 'Billing alerts', description: 'Invoices, payment failed, and subscription updates', defaultChecked: true },
  { label: 'Daily Digest', description: 'Receive a daily summary of your activity', defaultChecked: false },
]

export default function NotificationsSettingsPage() {
  return (
    <Card variant="brand" className="border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose what notifications you want to receive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {preferences.map((pref) => (
          <div key={pref.label} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{pref.label}</p>
              <p className="text-sm text-muted-foreground">{pref.description}</p>
            </div>
            <Switch defaultChecked={pref.defaultChecked} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
