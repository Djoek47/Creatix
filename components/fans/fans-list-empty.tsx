'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC } from '@/lib/platform-logos'
import { cn } from '@/lib/utils'

export const INTEGRATIONS_HREF = '/dashboard/settings?tab=integrations'

export type FansListPlatformScope = 'all' | 'onlyfans' | 'fansly'

type LiveFilterHint = 'active' | 'expired' | 'latest' | 'top'

interface FansListEmptyConnectedProps {
  /** Which platforms to show hubs for — respects Fans page toolbar scope. */
  platformScope?: FansListPlatformScope
  hasOnlyFansConnected: boolean
  hasFanslyConnected: boolean
  liveFilter?: LiveFilterHint
  onQuickSync?: () => void
  quickSyncBusy?: boolean
}

function LogoHubLink({
  href,
  label,
  src,
  logoAlt,
  description,
}: {
  href: string
  label: string
  src: string
  logoAlt: string
  description: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col items-center rounded-3xl border border-border/70 bg-muted/15 px-6 py-8 transition-colors',
        'hover:border-primary/35 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
      aria-label={label}
    >
      <span className="relative block w-full">
        <Image
          src={src}
          alt=""
          width={320}
          height={96}
          className={cn(
            'mx-auto h-[3rem] w-auto max-h-[52px] object-contain object-center sm:h-[3.75rem]',
            logoAlt === 'OnlyFans' ? 'sm:max-w-[280px]' : 'sm:max-w-[260px]',
          )}
          priority
          draggable={false}
        />
      </span>
      <p className="mt-5 max-w-[22rem] text-center text-[13px] leading-snug tracking-tight text-muted-foreground">{description}</p>
      <span className="mt-4 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/90 transition-colors group-hover:text-foreground">
        Integration settings
      </span>
    </Link>
  )
}

export function FansListEmptyConnected({
  platformScope = 'all',
  hasOnlyFansConnected,
  hasFanslyConnected,
  liveFilter,
  onQuickSync,
  quickSyncBusy = false,
}: FansListEmptyConnectedProps) {
  const showOnlyFans =
    hasOnlyFansConnected && (platformScope === 'all' || platformScope === 'onlyfans')
  const showFansly =
    hasFanslyConnected && (platformScope === 'all' || platformScope === 'fansly')

  if (liveFilter) {
    return (
      <div className="flex flex-col items-center py-14 text-center sm:py-16">
        <div className="mb-4 rounded-full bg-muted p-4">
          <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h3 className="text-[17px] font-semibold tracking-tight text-foreground">Nothing in this live view</h3>
        <p className="mt-2 max-w-md text-[14px] leading-relaxed text-muted-foreground">
          Open the fan list menu → <span className="text-foreground/90">All synced</span> to browse CRM, then use{' '}
          <span className="font-medium text-foreground/90">Sync → Quick sync</span> above. Live previews pull small
          subsets from{' '}
          {showOnlyFans && showFansly ? 'both platforms' : showOnlyFans ? 'OnlyFans' : 'Fansly'} — the partner sometimes
          returns no rows until your session catches up or subs exist in this cohort.
        </p>
      </div>
    )
  }

  const ofDescription =
    'Your OnlyFans subscriber list pulls into Circe after quick sync — new fans arrive as subs renew or tips arrive.'

  const flDescription =
    'Your Fansly subscribers sync the same way: run quick sync once, then new fans populate as subscriptions and purchases flow in.'

  return (
    <div className="flex flex-col items-center py-14 text-center sm:py-16">
      <h3 className="text-[18px] font-semibold tracking-tight text-foreground">No fans in this hub yet</h3>
      <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
        You’re linked —{' '}
        {showOnlyFans && showFansly
          ? 'each platform has its own hub below.'
          : showOnlyFans
            ? 'below is OnlyFans.'
            : 'below is Fansly.'}{' '}
        Sync once to hydrate fans, or reopen settings if credentials need a refresh.
      </p>

      <div
        className={cn(
          'mt-10 grid w-full max-w-xl gap-8 sm:max-w-none',
          showOnlyFans && showFansly ? 'sm:grid-cols-2 sm:gap-10 lg:max-w-4xl' : 'justify-items-center',
        )}
      >
        {showOnlyFans ? (
          <div className="flex w-full max-w-[22rem] flex-col gap-4 sm:max-w-none">
            <LogoHubLink
              href={INTEGRATIONS_HREF}
              logoAlt="OnlyFans"
              src={ONLYFANS_LOGO_SRC}
              label="OnlyFans — open integration settings"
              description={ofDescription}
            />
          </div>
        ) : null}
        {showFansly ? (
          <div className="flex w-full max-w-[22rem] flex-col gap-4 sm:max-w-none">
            <LogoHubLink
              href={INTEGRATIONS_HREF}
              logoAlt="Fansly"
              src={FANSLY_LOGO_SRC}
              label="Fansly — open integration settings"
              description={flDescription}
            />
          </div>
        ) : null}
      </div>

      {typeof onQuickSync === 'function' ? (
        <div className="mt-12 flex max-w-md flex-col items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 px-10 text-[13px]"
            disabled={quickSyncBusy}
            onClick={() => onQuickSync()}
          >
            {quickSyncBusy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing…
              </>
            ) : (
              <>Quick sync from connected platforms</>
            )}
          </Button>
          <p className="text-[11px] text-muted-foreground">Runs the same action as Sync → Quick sync above.</p>
        </div>
      ) : null}
    </div>
  )
}

export function FansListEmptyDisconnected() {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold tracking-tight">Connect a fan hub</h3>
      <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-muted-foreground">
        Link OnlyFans or Fansly to mirror subscribers — each platform has its own tile on the integrations page.
      </p>

      <div className="mt-10 grid w-full max-w-xl gap-8 sm:grid-cols-2 sm:gap-10">
        <LogoHubLink
          href={INTEGRATIONS_HREF}
          logoAlt="OnlyFans"
          src={ONLYFANS_LOGO_SRC}
          label="Connect OnlyFans"
          description="Connect your OnlyFans creator account to sync subscribers, spend, and chat context."
        />
        <LogoHubLink
          href={INTEGRATIONS_HREF}
          logoAlt="Fansly"
          src={FANSLY_LOGO_SRC}
          label="Connect Fansly"
          description="Connect Fansly to pull followers and subscribers into the same CRM."
        />
      </div>

      <Button variant="secondary" size="sm" className="mt-10" asChild>
        <Link href={INTEGRATIONS_HREF}>Open integrations</Link>
      </Button>
    </div>
  )
}
