'use client'

import type { ComponentType } from 'react'
import { ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const SURFACE = cn(
  'text-card-foreground flex flex-col overflow-hidden rounded-2xl border border-border/55 bg-card',
  'shadow-[0_1px_2px_rgba(0,0,0,0.045)]',
  'dark:border-white/[0.07] dark:bg-zinc-950/40 dark:shadow-none',
)

const HEADER = 'space-y-2 border-b border-border/40 px-6 pb-5 pt-8 sm:px-8 sm:pb-6 sm:pt-10'
const TITLE = 'font-sans text-[1.25rem] font-semibold tracking-[-0.022em] text-foreground sm:text-[1.3125rem]'
const DESCRIPTION = 'max-w-xl font-sans text-[0.9375rem] leading-relaxed text-muted-foreground'
const CONTENT = 'px-0 py-0 sm:px-0'

function TwitterXGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 1.802c-2.67 0-2.986.01-4.04.058-.976.045-1.505.207-1.858.344-.466.182-.8.398-1.15.748-.35.35-.566.684-.748 1.15-.137.353-.3.882-.344 1.857-.048 1.055-.058 1.37-.058 4.041 0 2.67.01 2.986.058 4.04.045.976.207 1.505.344 1.858.182.466.399.8.748 1.15.35.35.684.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058 2.67 0 2.987-.01 4.04-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.684.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041 0-2.67-.01-2.986-.058-4.04-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 0 0-.748-1.15 3.098 3.098 0 0 0-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.055-.048-1.37-.058-4.041-.058zm0 3.063a5.135 5.135 0 1 1 0 10.27 5.135 5.135 0 0 1 0-10.27zm0 8.468a3.333 3.333 0 1 0 0-6.666 3.333 3.333 0 0 0 0 6.666zm6.538-8.671a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z" />
    </svg>
  )
}

function TikTokGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  )
}

type SocialKey = 'twitter' | 'instagram' | 'tiktok'

const ROWS: {
  key: SocialKey
  name: string
  Icon: ComponentType<{ className?: string }>
  iconClass: string
}[] = [
  { key: 'twitter', name: 'Twitter/X', Icon: TwitterXGlyph, iconClass: 'h-[1.125rem] w-[1.125rem]' },
  { key: 'instagram', name: 'Instagram', Icon: InstagramGlyph, iconClass: 'h-[1.125rem] w-[1.125rem]' },
  { key: 'tiktok', name: 'TikTok', Icon: TikTokGlyph, iconClass: 'h-[1.125rem] w-[1.125rem]' },
]

export type SocialConnections = Record<SocialKey, boolean>

export function SocialAccountsSettings({
  connected,
  onConnectedChange,
}: {
  connected: SocialConnections
  onConnectedChange: (key: SocialKey, value: boolean) => void
}) {
  return (
    <Card className={SURFACE}>
      <CardHeader className={HEADER}>
        <CardTitle className={TITLE}>Social</CardTitle>
        <CardDescription className={DESCRIPTION}>
          Accounts used for reputation monitoring. Only you can connect or disconnect them.
        </CardDescription>
      </CardHeader>
      <CardContent className={CONTENT}>
        <ul className="divide-y divide-border/35" role="list">
          {ROWS.map(({ key, name, Icon, iconClass }) => {
            const isOn = connected[key]
            return (
              <li key={key}>
                <div className="flex min-h-[4.25rem] items-center justify-between gap-4 px-6 py-3.5 sm:px-8 sm:py-4">
                  <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]',
                        'border border-border/45 bg-muted/[0.22] text-foreground/85',
                        'dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-foreground/90',
                      )}
                      aria-hidden
                    >
                      <Icon className={iconClass} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[0.9375rem] font-medium tracking-[-0.01em] text-foreground">
                        {name}
                      </p>
                      <p className="mt-0.5 text-[0.8125rem] leading-snug text-muted-foreground">
                        {isOn ? 'Connected' : 'Not linked'}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'group/action inline-flex h-9 shrink-0 items-center gap-0.5 rounded-lg px-3 text-[0.8125rem] font-medium',
                      'text-foreground/80 hover:bg-foreground/[0.06] hover:text-foreground',
                      'dark:hover:bg-white/[0.06]',
                      isOn &&
                        'text-muted-foreground hover:text-destructive hover:bg-destructive/[0.06] dark:hover:bg-destructive/[0.08]',
                    )}
                    onClick={() => {
                      if (isOn) {
                        void fetch(`/api/${key}/disconnect`, { method: 'POST' }).then(() => {
                          onConnectedChange(key, false)
                        })
                      } else {
                        window.location.href = `/api/${key}/auth`
                      }
                    }}
                  >
                    {isOn ? 'Disconnect' : 'Connect'}
                    {!isOn ? (
                      <ChevronRight
                        className="h-3.5 w-3.5 opacity-40 transition-opacity group-hover/action:opacity-70"
                        aria-hidden
                      />
                    ) : null}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
