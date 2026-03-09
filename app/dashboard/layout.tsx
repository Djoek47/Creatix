import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import type { Profile } from '@/lib/types'

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

  let profile: Profile | null = null
  let hasConnectedPlatform = false
  try {
    const [profileRes, connectionsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('platform_connections').select('id').eq('user_id', user.id).eq('is_connected', true),
    ])
    profile = profileRes.data as Profile | null
    hasConnectedPlatform = (connectionsRes.data?.length ?? 0) > 0
  } catch {
    // Tables may not exist or RLS may block; continue with safe defaults
  }

  return (
    <DashboardShell user={user} profile={profile} hasConnectedPlatform={hasConnectedPlatform}>
      {children}
    </DashboardShell>
  )
}
