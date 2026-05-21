'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { AtSign, History, Plug } from 'lucide-react'
import type { ScanIdentityHandleRow } from '@/hooks/use-scan-identity'
import { scanSourcePlatformKey } from '@/lib/scan-identity'
import { translatedScanSourcePlatformDisplayName } from '@/lib/scan-identity-i18n'
import { scanIdentityBrandMarkForSource, type ScanIdentityBrandMark } from '@/lib/scan-identity-ui'
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC } from '@/lib/platform-logos'
import { cn } from '@/lib/utils'

type Props = {
  handles: ScanIdentityHandleRow[]
}

function IdentityBrandMark({ mark, className }: { mark: ScanIdentityBrandMark; className?: string }) {
  if (mark.kind === 'image') {
    return (
      <img
        src={mark.src}
        alt={mark.alt}
        className={cn('h-10 w-auto shrink-0 object-contain object-left sm:h-11', className)}
        width={160}
        height={40}
      />
    )
  }
  if (mark.kind === 'special') {
    return (
      <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground', className)} aria-hidden>
        {mark.type === 'former' ? <History className="h-5 w-5" /> : <AtSign className="h-5 w-5" />}
      </span>
    )
  }
  return (
    <span
      className={cn('flex h-6 min-w-8 shrink-0 items-center justify-center text-[10px] font-semibold text-muted-foreground', className)}
      aria-hidden
    >
      {mark.text}
    </span>
  )
}

/**
 * Minimal “Easy” scan setup: uses only connected integrations—no extra aliases or per-handle toggles.
 * Advanced identity (former names, extras, title hints) lives in Pro mode.
 */
export function ProtectionEasyHandles({ handles }: Props) {
  const t = useTranslations('dashboard')

  if (handles.length === 0) {
    return (
      <div
        className="space-y-3 rounded-xl border border-dashed border-border bg-muted/15 p-4 text-center"
        data-tour="protection-identity"
      >
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
          <Plug className="h-5 w-5" aria-hidden />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{t('protectionEasyHandles.emptyTitle')}</p>
          <p className="text-xs text-muted-foreground">
            {t('protectionEasyHandles.emptyBody')}
          </p>
        </div>
        <Link
          href="/dashboard/settings?tab=integrations"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t('protectionEasyHandles.openIntegrations')}
        </Link>
        <p className="text-[11px] text-muted-foreground">
          {t.rich('protectionEasyHandles.proHint', {
            pro: (chunks) => <span className="text-foreground/80">{chunks}</span>,
          })}
        </p>
      </div>
    )
  }

  const platformKeys = new Set(handles.map((h) => scanSourcePlatformKey(h.source)))
  const hasOnlyFans = platformKeys.has('onlyfans')
  const hasFansly = platformKeys.has('fansly')
  const showOfAndFanslyRow = hasOnlyFans && hasFansly

  return (
    <div
      className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground shadow-sm"
      data-tour="protection-identity"
    >
      {showOfAndFanslyRow ? (
        <div className="mb-3 flex flex-wrap items-center gap-6">
          <img
            src={ONLYFANS_LOGO_SRC}
            alt="OnlyFans"
            className="h-11 w-auto object-contain object-left sm:h-12"
            width={200}
            height={48}
          />
          <img
            src={FANSLY_LOGO_SRC}
            alt="Fansly"
            className="h-11 w-auto object-contain object-left sm:h-12"
            width={200}
            height={48}
          />
        </div>
      ) : null}

      <ul className="space-y-2.5">
        {handles.map((h) => {
          const key = scanSourcePlatformKey(h.source)
          const mark = scanIdentityBrandMarkForSource(h.source)
          const platformName = translatedScanSourcePlatformDisplayName(h.source, t)
          const skipLeadingLogo =
            showOfAndFanslyRow && (key === 'onlyfans' || key === 'fansly') && mark.kind === 'image'

          return (
            <li key={`${h.source}:${h.value}`} className="flex min-w-0 items-start gap-3 sm:gap-3.5">
              {skipLeadingLogo ? null : <IdentityBrandMark mark={mark} />}
              <div className={cn('min-w-0 flex-1 leading-snug', skipLeadingLogo && 'w-full')}>
                <p className="font-medium text-foreground">
                  <span className="text-muted-foreground">{platformName}</span>{' '}
                  <span className="font-semibold text-foreground">@{h.value}</span>
                </p>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-sm text-foreground">
        {t.rich(
          handles.length === 1 ? 'protectionEasyHandles.scanReadySingle' : 'protectionEasyHandles.scanReadyPlural',
          {
            invoke: (chunks) => <span className="font-medium">{chunks}</span>,
          },
        )}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {t('protectionEasyHandles.extrasNote')}
      </p>
    </div>
  )
}
