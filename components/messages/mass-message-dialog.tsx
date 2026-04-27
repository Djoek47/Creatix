'use client'

import { useState } from 'react'
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

export function MassMessageDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="inline-flex items-stretch">
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'h-10 gap-2 rounded-l-xl rounded-r-none border-0 bg-foreground px-3.5 font-medium text-background shadow-sm',
            'transition-opacity duration-200 ease-out hover:bg-foreground hover:opacity-90',
          )}
          onClick={() => setOpen(true)}
        >
          <Megaphone className="h-4 w-4" />
          Mass Message
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-10 min-w-10 rounded-l-none rounded-r-xl border-0 border-l border-background/20 bg-foreground px-2 text-background shadow-sm transition-opacity duration-200 hover:bg-foreground hover:opacity-90"
              aria-label="More mass message options"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem asChild>
              <Link
                href="/dashboard/messages/mass"
                className="flex cursor-pointer items-start gap-2 py-2.5"
              >
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
