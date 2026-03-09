import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const [{ data: profile }, { data: connections }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('platform_connections').select('id').eq('user_id', user.id).eq('is_connected', true),
  ])
  const hasConnectedPlatform = (connections?.length ?? 0) > 0

  return (
    <DashboardShell user={user} profile={profile} hasConnectedPlatform={hasConnectedPlatform}>
      {children}
    </DashboardShell>
  )
}
