'use client'

import type { ReactNode } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, Sparkles } from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
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
  const t = useTranslations('dashboard')
  const pathname = usePathname() ?? ''
  const { focusMode, workspaceBarCollapsed, setWorkspaceBarCollapsed, setFocusMode } =
    useMessagesFocusChrome()
  const pulseOptional = useDashboardPulseOptional()
  const pulseSeverity = pulseOptional?.pulse?.severity
  const isMessagesInbox =
    (pathname === '/dashboard/messages' || pathname.startsWith('/dashboard/messages/')) &&
    !pathname.startsWith('/dashboard/messages/mass')
  const hideWorkspaceHeader = isMessagesInbox && (focusMode || workspaceBarCollapsed)

  return (
    <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
      {!hideWorkspaceHeader ? (
        <div className="relative z-20 shrink-0">
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
        </div>
      ) : (
        <div
          className="relative z-[25] flex h-9 shrink-0 items-center justify-center gap-2 border-b border-border/20 bg-background/35 px-2 backdrop-blur-md dark:bg-background/25"
          role="region"
          aria-label="Collapsed workspace bar"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => {
              setWorkspaceBarCollapsed(false)
              setFocusMode(false)
            }}
            aria-expanded={false}
          >
            <ChevronDown className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            Show workspace bar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            asChild
            title={t('messagesChrome.aiStudioToolsTitle')}
          >
            <Link href="/dashboard/ai-studio/tools" aria-label={t('messagesChrome.aiStudioToolsAria')}>
              <Sparkles className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      )}
      <main
        className={cn(
          /* Vertical scroll only on this node. Horizontal padding lives on an inner wrapper so route
             heroes never need negative margins: with `overflow-y: auto`, `overflow-x` computes to
             `auto`, and bleed-out margins break `position: sticky` in Chrome/WebKit. */
          /* z-0: header strip is z-20 so avatar credit chip (extends below header) stays above scrolling content. */
          'relative z-0 min-h-0 flex-1 bg-transparent',
          !isMessagesInbox && 'mobile-safe-shell w-full overflow-y-auto py-3 mobile-bottom-nav-pad sm:py-6 md:pb-6',
          /* Inbox (normal or focus): column flex + min-h-0 so chat composer + Divine strip stay in view */
          isMessagesInbox &&
            'flex min-h-0 flex-col overflow-hidden p-0 pb-[env(safe-area-inset-bottom,0px)]',
        )}
      >
        {!isMessagesInbox ? (
          <div className="mobile-safe-shell px-[max(0.75rem,env(safe-area-inset-left))] pe-[max(0.75rem,env(safe-area-inset-right))] sm:px-[max(1.5rem,env(safe-area-inset-left))] sm:pe-[max(1.5rem,env(safe-area-inset-right))]">
            {children}
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  )
}
