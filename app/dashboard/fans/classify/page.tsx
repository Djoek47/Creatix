import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SmartClassifyClient } from '@/components/fans/smart-classify-client'

export default async function SmartClassifyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: connections } = await supabase
    .from('platform_connections')
    .select('platform')
    .eq('user_id', user.id)
    .eq('is_connected', true)
    .in('platform', ['onlyfans', 'fansly'])

  const hasOnlyFans = connections?.some((c) => c.platform === 'onlyfans') ?? false
  const hasFansly = connections?.some((c) => c.platform === 'fansly') ?? false

  return <SmartClassifyClient hasOnlyFans={hasOnlyFans} hasFansly={hasFansly} />
}
