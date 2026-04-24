'use client'

import type { ReactNode } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { usePathname } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/header'
import type { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useMessagesFocusChrome } from '@/components/messages/messages-focus-chrome-context'

type Props = {
  user: SupabaseUser
  profile: Profile | null
  children: ReactNode
}

export function DashboardMessagesChrome({ user, profile, children }: Props) {
  const pathname = usePathname() ?? ''
  const { focusMode } = useMessagesFocusChrome()
  const isMessagesInbox =
    (pathname === '/dashboard/messages' || pathname.startsWith('/dashboard/messages/')) &&
    !pathname.startsWith('/dashboard/messages/mass')
  const zenMessages = focusMode && isMessagesInbox

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {!zenMessages ? <DashboardHeader user={user} profile={profile} /> : null}
      <main
        className={cn(
          'min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6',
          zenMessages && 'overflow-hidden p-0 sm:p-0',
        )}
      >
        {children}
      </main>
    </div>
  )
}
