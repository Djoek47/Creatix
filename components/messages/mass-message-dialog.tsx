'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Megaphone, SlidersHorizontal } from 'lucide-react'
import { MassMessageComposer } from '@/components/messages/mass-message-composer'
import { cn } from '@/lib/utils'

/** Megaphone + chevron control (opens dialog via parent state). Use with `MassMessageDialog` `showTrigger={false}`. */
export function MassMessageLaunchControl({ onOpen }: { onOpen: () => void }) {
  const t = useTranslations('massCampaign.quickDialog')
  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-xl border border-border/30 bg-background/80 shadow-sm ring-1 ring-border/15 dark:ring-white/[0.06]">
      <Button
        type="button"
        variant="ghost"
        className={cn(
          'h-9 gap-2 rounded-none rounded-l-xl border-0 px-4 text-[13px] font-medium tracking-tight text-foreground',
          'bg-muted/30 transition-colors duration-200 ease-out hover:bg-muted/50',
        )}
        onClick={() => onOpen()}
      >
        <Megaphone className="h-3.5 w-3.5 opacity-80" />
        {t('triggerLabel')}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="h-9 w-9 shrink-0 rounded-none rounded-r-xl border-0 border-l border-border/25 bg-muted/20 px-0 text-foreground transition-colors duration-200 ease-out hover:bg-muted/40"
            aria-label={t('moreOptionsAria')}
          >
            <ChevronDown className="h-3.5 w-3.5 opacity-80" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 rounded-2xl border-border/35 p-1 shadow-lg">
          <DropdownMenuItem asChild>
            <Link href="/dashboard/messages/mass" className="flex cursor-pointer items-start gap-3 rounded-xl py-3 pl-3 pr-2">
              <SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex flex-col gap-1">
                <span className="text-sm font-medium leading-tight">{t('proPageTitle')}</span>
                <span className="text-xs font-normal leading-relaxed text-muted-foreground">{t('proPageSubtitle')}</span>
              </span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

type MassMessageDialogProps = {
  /** Controlled open state (e.g. mobile header). If omitted, dialog manages its own state. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** When false, render only the dialog body; parent opens via `open` / `onOpenChange`. */
  showTrigger?: boolean
}

export function MassMessageDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  showTrigger = true,
}: MassMessageDialogProps) {
  const t = useTranslations('massCampaign.quickDialog')
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = useCallback(
    (next: boolean) => {
      controlledOnOpenChange?.(next)
      if (!isControlled) setUncontrolledOpen(next)
    },
    [controlledOnOpenChange, isControlled],
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger ? <MassMessageLaunchControl onOpen={() => setOpen(true)} /> : null}
      <DialogContent className="gap-0 overflow-hidden rounded-3xl border-border/40 p-0 sm:max-w-lg">
        <DialogHeader className="space-y-2 border-b border-border/30 bg-muted/15 px-6 py-6 text-left">
          <DialogTitle className="flex items-center gap-2.5 text-xl font-light tracking-tight">
            <Megaphone className="h-5 w-5 text-muted-foreground" />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">{t('description')}</DialogDescription>
        </DialogHeader>
        <div className="px-6 py-5">
          <MassMessageComposer active={open} embedded={false} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
