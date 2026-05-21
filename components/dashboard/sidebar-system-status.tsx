'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { BookOpen, ChevronRight, Settings, type LucideIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SheetClose } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const GUIDE_HREF = '/dashboard/guide'
const SETTINGS_HREF = '/dashboard/settings'

type Props = {
  /** Desktop rail uses sidebar tokens; mobile sheet uses foreground/muted. */
  variant: 'sidebar' | 'mobile'
  className?: string
}

function ResourceRow({
  variant,
  href,
  icon: Icon,
  title,
  meta,
  onPick,
}: {
  variant: 'sidebar' | 'mobile'
  href: string
  icon: LucideIcon
  title: string
  meta: string
  onPick: () => void
}) {
  const inner = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/55 bg-muted/30">
        <Icon className="h-4 w-4 text-foreground/75" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[15px] font-medium leading-tight tracking-[-0.02em] text-foreground">
          {title}
        </span>
        <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">{meta}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/55" aria-hidden />
    </>
  )

  const rowClass =
    'flex w-full items-center gap-3 px-4 py-3 outline-none transition-colors duration-150 ease-out hover:bg-muted/45 focus-visible:bg-muted/45 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'

  if (variant === 'mobile') {
    return (
      <SheetClose asChild>
        <Link href={href} className={rowClass} onClick={onPick}>
          {inner}
        </Link>
      </SheetClose>
    )
  }

  return (
    <Link href={href} className={rowClass} onClick={onPick}>
      {inner}
    </Link>
  )
}

/**
 * Bottom-of-rail status control: calm “operational” signal; popover connects to Guide & Settings.
 */
export function SidebarSystemStatus({ variant, className }: Props) {
  const tNav = useTranslations('navigation')
  const [open, setOpen] = useState(false)

  const isSidebar = variant === 'sidebar'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'group w-full rounded-2xl text-left outline-none transition-[background-color,box-shadow] duration-200 ease-out',
            'focus-visible:ring-2 focus-visible:ring-offset-2',
            isSidebar
              ? cn(
                  'border border-sidebar-border/30 bg-sidebar-accent/[0.06] px-3.5 py-3 shadow-none',
                  'hover:bg-sidebar-accent/[0.12] dark:border-sidebar-border/25 dark:bg-sidebar-accent/[0.05] dark:hover:bg-sidebar-accent/10',
                  'focus-visible:ring-sidebar-ring focus-visible:ring-offset-sidebar',
                )
              : cn(
                  'border border-border/45 bg-muted/20 px-3.5 py-3 hover:bg-muted/35 dark:bg-muted/15 dark:hover:bg-muted/25',
                  'focus-visible:ring-ring focus-visible:ring-offset-background',
                ),
            className,
          )}
          aria-label={tNav('sidebar.systemStripOpen')}
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center" aria-hidden>
              <span className="absolute inset-0 rounded-full bg-emerald-500/25 dark:bg-emerald-400/20" />
              <span className="relative block h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_1px_rgba(255,255,255,0.55)] dark:bg-emerald-400 dark:shadow-[0_0_0_1px_rgba(0,0,0,0.35)]" />
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'text-[13px] font-medium leading-[1.25] tracking-[-0.02em]',
                  isSidebar ? 'text-sidebar-foreground' : 'text-foreground',
                )}
              >
                {tNav('sidebar.systemStripStatus')}
              </p>
              <p
                className={cn(
                  'mt-0.5 text-[11px] leading-snug tracking-[-0.01em]',
                  isSidebar ? 'text-sidebar-foreground/50' : 'text-muted-foreground',
                )}
              >
                {tNav('sidebar.systemStripTriggerSub')}
              </p>
            </div>
            <ChevronRight
              className={cn(
                'h-4 w-4 shrink-0 transition-transform duration-200 ease-out',
                isSidebar
                  ? 'text-sidebar-foreground/30 group-data-[state=open]:translate-x-0.5 group-data-[state=open]:text-sidebar-foreground/50'
                  : 'text-foreground/35 group-data-[state=open]:translate-x-0.5',
              )}
              aria-hidden
            />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={10}
        collisionPadding={16}
        className={cn(
          'w-[min(300px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border/50 p-0 shadow-xl',
          'bg-popover text-popover-foreground',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=top]:slide-in-from-bottom-2',
        )}
      >
        <header className="border-b border-border/45 px-4 pb-3 pt-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {tNav('sidebar.systemStripPopoverEyebrow')}
          </p>
          <p className="mt-1 text-[20px] font-semibold leading-none tracking-[-0.03em] text-foreground">
            {tNav('sidebar.systemStripPopoverBrand')}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{tNav('sidebar.systemStripPopoverBody')}</p>
        </header>
        <nav className="py-1" aria-label={tNav('sidebar.systemStripOpen')}>
          <ResourceRow
            variant={variant}
            href={GUIDE_HREF}
            icon={BookOpen}
            title={tNav('sidebar.guide')}
            meta={tNav('sidebar.systemStripGuideMeta')}
            onPick={() => setOpen(false)}
          />
          <ResourceRow
            variant={variant}
            href={SETTINGS_HREF}
            icon={Settings}
            title={tNav('sidebar.settings')}
            meta={tNav('sidebar.systemStripSettingsMeta')}
            onPick={() => setOpen(false)}
          />
        </nav>
      </PopoverContent>
    </Popover>
  )
}
