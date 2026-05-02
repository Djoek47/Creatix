'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
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
  integrationCaption,
}: {
  href: string
  label: string
  src: string
  logoAlt: string
  description: string
  integrationCaption: string
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
        {integrationCaption}
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
  const t = useTranslations('fans.empty')
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
        <h3 className="text-[17px] font-semibold tracking-tight text-foreground">{t('liveNothingTitle')}</h3>
        <p className="mt-2 max-w-md text-[14px] leading-relaxed text-muted-foreground">
          {t('liveNothingBody', {
            allSynced: t('allSynced'),
            quickSync: t('quickSync'),
            platforms:
              showOnlyFans && showFansly
                ? t('platformsBoth')
                : showOnlyFans
                  ? t('platformsOf')
                  : t('platformsFl'),
          })}
        </p>
      </div>
    )
  }

  const ofDescription = t('ofHubDescription')
  const flDescription = t('flHubDescription')

  return (
    <div className="flex flex-col items-center py-14 text-center sm:py-16">
      <h3 className="text-[18px] font-semibold tracking-tight text-foreground">{t('hubTitle')}</h3>
      <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
        {showOnlyFans && showFansly ? t('hubBodyBoth') : showOnlyFans ? t('hubBodyOf') : t('hubBodyFl')}
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
              label={t('flHubAria')}
              description={flDescription}
              integrationCaption={t('integrationSettings')}
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
                {t('syncing')}
              </>
            ) : (
              <>{t('quickSyncCta')}</>
            )}
          </Button>
          <p className="text-[11px] text-muted-foreground">{t('quickSyncSameAsMenu')}</p>
        </div>
      ) : null}
    </div>
  )
}

export function FansListEmptyDisconnected() {
  const t = useTranslations('fans.empty')
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
      <h3 className="text-lg font-semibold tracking-tight">{t('disconnectedTitle')}</h3>
      <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-muted-foreground">{t('disconnectedBody')}</p>

      <div className="mt-10 grid w-full max-w-xl gap-8 sm:grid-cols-2 sm:gap-10">
        <LogoHubLink
          href={INTEGRATIONS_HREF}
          logoAlt="OnlyFans"
          src={ONLYFANS_LOGO_SRC}
          label={t('connectOfAria')}
          description={t('connectOfDescription')}
          integrationCaption={t('integrationSettings')}
        />
        <LogoHubLink
          href={INTEGRATIONS_HREF}
          logoAlt="Fansly"
          src={FANSLY_LOGO_SRC}
          label={t('connectFlAria')}
          description={t('connectFlDescription')}
          integrationCaption={t('integrationSettings')}
        />
      </div>

      <Button variant="secondary" size="sm" className="mt-10" asChild>
        <Link href={INTEGRATIONS_HREF}>{t('openIntegrations')}</Link>
      </Button>
    </div>
  )
}
