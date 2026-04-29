'use client'

import type { ReactNode } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { usePathname } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/header'
import type { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useMessagesFocusChrome } from '@/components/messages/messages-focus-chrome-context'
import { useDashboardPulseOptional } from '@/components/dashboard/dashboard-pulse-provider'

type Props = {
  user: SupabaseUser
  profile: Profile | null
  children: ReactNode
}

export function DashboardMessagesChrome({ user, profile, children }: Props) {
  const pathname = usePathname() ?? ''
  const { focusMode } = useMessagesFocusChrome()
  const pulseOptional = useDashboardPulseOptional()
  const pulseSeverity = pulseOptional?.pulse?.severity
  const isMessagesInbox =
    (pathname === '/dashboard/messages' || pathname.startsWith('/dashboard/messages/')) &&
    !pathname.startsWith('/dashboard/messages/mass')
  const zenMessages = focusMode && isMessagesInbox

  return (
    <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
      {!zenMessages ? (
        <>
          <DashboardHeader user={user} profile={profile} />
          <div
            className={cn(
              'h-px w-full shrink-0 transition-colors duration-300',
              pulseSeverity === 'intervene' && 'bg-rose-500/45',
              pulseSeverity === 'attend' && 'bg-amber-500/40',
              pulseSeverity === 'steady' && 'bg-emerald-500/25',
              !pulseSeverity && 'bg-border/20',
            )}
            aria-hidden
          />
        </>
      ) : null}
      <main
        className={cn(
          /* Avoid `overflow-x: hidden` on this scrollport — it breaks `position: sticky` for route heroes
             (Chrome/WebKit). Rely on `min-w-0` + page layout to contain width. */
          'min-h-0 flex-1 bg-transparent',
          !isMessagesInbox && 'w-full min-w-0 overflow-y-auto p-4 sm:p-6',
          /* Inbox (normal or focus): column flex + min-h-0 so chat composer + Divine strip stay in view */
          isMessagesInbox &&
            'flex min-h-0 flex-col overflow-hidden p-0 pb-[env(safe-area-inset-bottom,0px)]',
        )}
      >
        {children}
      </main>
    </div>
  )
}
