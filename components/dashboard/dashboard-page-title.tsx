'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TITLE_MAP: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of your creator business' },
  '/dashboard/fans': { title: 'Fan Management', subtitle: 'Track and manage your subscribers across all platforms' },
  '/dashboard/fans/new': { title: 'Add New Fan', subtitle: 'Add a subscriber to your list' },
  '/dashboard/content': { title: 'Content Calendar', subtitle: 'Schedule and manage your content' },
  '/dashboard/content/new': { title: 'Create Content', subtitle: 'Schedule a new post' },
  '/dashboard/messages': { title: 'Messages', subtitle: 'Conversations with your fans' },
  '/dashboard/analytics': { title: 'Analytics', subtitle: 'Performance and revenue insights' },
  '/dashboard/ai-studio': { title: 'AI Studio', subtitle: 'AI-powered tools for creators' },
  '/dashboard/protection': { title: 'Leak Protection', subtitle: 'Monitor and respond to leaked content' },
  '/dashboard/mentions': { title: 'Reputation Monitor', subtitle: 'Track mentions and sentiment' },
  '/dashboard/notifications': { title: 'Notifications', subtitle: 'Alerts, mentions, and unread messages' },
  '/dashboard/connect': { title: 'Connect your platform', subtitle: 'Link OnlyFans, MYM, and Fansly' },
}

function getTitleForPath(pathname: string): { title: string; subtitle?: string } {
  if (TITLE_MAP[pathname]) return TITLE_MAP[pathname]
  if (pathname.startsWith('/dashboard/settings')) return { title: 'Settings', subtitle: 'Manage your account and preferences' }
  // Fallback: last segment as title
  const segment = pathname.split('/').filter(Boolean).pop() || 'Dashboard'
  const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
  return { title, subtitle: undefined }
}

/**
 * Single dashboard page title. One title visible at a time; when route changes, it swaps (one disappears, the other arrives).
 */
export function DashboardPageTitle() {
  const pathname = usePathname()
  const { title, subtitle } = getTitleForPath(pathname)

  return (
    <div
      key={pathname}
      className={cn(
        'mb-6 animate-in fade-in duration-200 fill-mode-both',
        'tabular-nums'
      )}
    >
      <h1 className="font-title text-2xl font-normal tracking-tight text-foreground sm:text-3xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  )
}
