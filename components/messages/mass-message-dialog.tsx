'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
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
  return (
    <div className="inline-flex items-stretch rounded-lg ring-1 ring-border/20 dark:ring-white/[0.08]">
      <Button
        type="button"
        variant="ghost"
        className={cn(
          'h-9 gap-2 rounded-none rounded-l-lg border-0 bg-foreground/92 px-3.5 text-[13px] font-semibold tracking-[-0.01em] text-background',
          'shadow-none transition-[background-color,opacity] duration-150 ease-out hover:bg-foreground hover:opacity-95',
        )}
        onClick={() => onOpen()}
      >
        <Megaphone className="h-3.5 w-3.5 opacity-90" />
        Mass Message
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="h-9 w-9 shrink-0 rounded-none rounded-r-lg border-0 border-l border-white/12 bg-foreground/92 px-0 text-background transition-[background-color,opacity] duration-150 ease-out hover:bg-foreground hover:opacity-95"
            aria-label="More mass message options"
          >
            <ChevronDown className="h-3.5 w-3.5 opacity-90" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-xl border-border/40 p-1 shadow-lg">
          <DropdownMenuItem asChild>
            <Link href="/dashboard/messages/mass" className="flex cursor-pointer items-start gap-2 py-2.5">
              <SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex flex-col gap-0.5">
                <span>Mass page (Pro)</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Advanced audience, PPV, and send parameters
                </span>
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

export function MassMessageDialog({ open: controlledOpen, onOpenChange: controlledOnOpenChange, showTrigger = true }: MassMessageDialogProps) {
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Send Mass Message
          </DialogTitle>
          <DialogDescription>
            Send a message to subscribers. OnlyFans and Fansly support paid (PPV) content: attach photos or videos and
            set a price so fans pay to unlock.
          </DialogDescription>
        </DialogHeader>
        <MassMessageComposer active={open} embedded={false} />
      </DialogContent>
    </Dialog>
  )
}
