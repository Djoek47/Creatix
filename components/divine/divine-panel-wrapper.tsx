'use client'

import type { User } from '@supabase/supabase-js'
import { DivinePanelProvider } from '@/components/divine/divine-panel-context'

/**
 * Provides Divine panel context (voice bridge, Divine Manager sync) without rendering
 * the slide-in assistant panel UI.
 */
export function DivinePanelWrapper({
  user,
  children,
}: {
  user: User
  children: React.ReactNode
}) {
  return <DivinePanelProvider user={user}>{children}</DivinePanelProvider>
}
