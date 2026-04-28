import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { mapContentFromDbRows } from '@/lib/content/map-content-from-db'
import { ContentWorkspace } from '@/components/content/content-workspace'

function ContentWorkspaceFallback() {
  return (
    <div
      className="h-40 rounded-2xl border border-border/35 bg-muted/20 motion-safe:animate-pulse"
      aria-hidden
    />
  )
}

export default async function ContentPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: contentRows } = await supabase
    .from('content')
    .select('*')
    .eq('user_id', user.id)
    .order('scheduled_at', { ascending: true })

  const content = mapContentFromDbRows(contentRows ?? [])

  return (
    <Suspense fallback={<ContentWorkspaceFallback />}>
      <ContentWorkspace content={content} />
    </Suspense>
  )
}
