import { createClient } from '@/lib/supabase/server'
import { SocialHub } from '@/components/social/social-hub'
import type { SocialConnectionRow } from '@/components/social/social-connected-links'

/** Server entry: loads connected platforms and renders the full Social hub client shell. */
export async function SocialDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: connections } = await supabase
    .from('platform_connections')
    .select('platform, platform_username, is_connected')
    .eq('user_id', user.id)
    .eq('is_connected', true)

  return <SocialHub connections={(connections || []) as SocialConnectionRow[]} />
}
