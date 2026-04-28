'use client'

import { useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CalendarDays, LayoutList, Library } from 'lucide-react'
import type { Content } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ContentHeader } from '@/components/content/content-header'
import { ContentCalendar } from '@/components/content/content-calendar'
import { ContentList } from '@/components/content/content-list'
import { MediaVaultHub } from '@/components/ai/media-vault-hub'

export type ContentWorkspaceView = 'schedule' | 'vault' | 'posts'

const VIEWS: readonly ContentWorkspaceView[] = ['schedule', 'vault', 'posts'] as const

function parseView(raw: string | null | undefined): ContentWorkspaceView {
  if (raw && (VIEWS as readonly string[]).includes(raw)) return raw as ContentWorkspaceView
  return 'schedule'
}

const SEGMENTS: {
  id: ContentWorkspaceView
  label: string
  short: string
  Icon: typeof CalendarDays
}[] = [
  { id: 'schedule', label: 'Schedule', short: 'Plan', Icon: CalendarDays },
  { id: 'vault', label: 'Vault', short: 'Vault', Icon: Library },
  { id: 'posts', label: 'All posts', short: 'List', Icon: LayoutList },
]

/**
 * Unified Content hub: calendar, media vault, and post list — URL-synced via `?view=`.
 */
export function ContentWorkspace({ content }: { content: Content[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const view = parseView(searchParams.get('view'))

  const setViewInUrl = useCallback(
    (next: ContentWorkspaceView) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next === 'schedule') {
        params.delete('view')
      } else {
        params.set('view', next)
      }
      const qs = params.toString()
      router.replace(qs ? `/dashboard/content?${qs}` : '/dashboard/content', { scroll: false })
    },
    [router, searchParams],
  )

  const activeMeta = useMemo(() => SEGMENTS.find((s) => s.id === view) ?? SEGMENTS[0], [view])

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Segmented control — calm, hardware-precise */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <nav
          role="tablist"
          aria-label="Content workspace"
          className={cn(
            'inline-flex w-full max-w-xl rounded-full border border-border/45 bg-muted/30 p-1',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
            'dark:bg-muted/15 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
          )}
        >
          {SEGMENTS.map(({ id, label, short, Icon }) => {
            const active = view === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`content-panel-${id}`}
                id={`content-tab-${id}`}
                onClick={() => setViewInUrl(id)}
                className={cn(
                  'flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full px-3 py-2',
                  'text-[13px] font-medium tracking-[-0.01em] transition-[background,box-shadow,color,transform] duration-200 ease-out',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2',
                  active
                    ? cn(
                        'bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_12px_-4px_rgba(0,0,0,0.12)]',
                        'dark:shadow-[0_1px_2px_rgba(0,0,0,0.35),0_4px_14px_-4px_rgba(0,0,0,0.45)]',
                      )
                    : 'text-muted-foreground/85 hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4 opacity-80" strokeWidth={1.75} aria-hidden />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{short}</span>
              </button>
            )
          })}
        </nav>

        <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground/90 sm:text-right">
          {view === 'schedule' && 'Place drops on the calendar — draft, scheduled, and published at a glance.'}
          {view === 'vault' && 'Media, metadata for Divine, and platform links — the shelf behind every post.'}
          {view === 'posts' && 'Every row in one table — edit, duplicate, or clean up without switching apps.'}
        </p>
      </div>

      {view !== 'vault' ? <ContentHeader /> : null}

      <div
        id={`content-panel-${view}`}
        role="tabpanel"
        aria-labelledby={`content-tab-${view}`}
        className="animate-in fade-in-0 duration-300 motion-reduce:animate-none"
      >
        {view === 'schedule' ? <ContentCalendar content={content} /> : null}
        {view === 'vault' ? (
          <div className="mx-auto w-full max-w-5xl">
            <MediaVaultHub />
          </div>
        ) : null}
        {view === 'posts' ? <ContentList content={content} /> : null}
      </div>

      <span className="sr-only" aria-live="polite">
        {activeMeta.label} view active
      </span>
    </div>
  )
}
