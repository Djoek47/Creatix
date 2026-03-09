import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsNav } from '@/components/settings/settings-nav'

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <SettingsNav />
        <div className="space-y-6 lg:col-span-2 min-w-0">
          {children}
        </div>
      </div>
    </div>
  )
}
