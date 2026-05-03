'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { ConnectedPlatforms } from '@/components/dashboard/connected-platforms'
import { RainbowSparklePill } from '@/components/dashboard/rainbow-sparkle-pill'
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC } from '@/lib/platform-logos'
import { cn } from '@/lib/utils'
import type { DivineDashboardPreset } from '@/lib/divine-manager'

/** Brand blues — match `ConnectedPlatforms` / official marks */
const ONLYFANS_BRAND_HEX = '#00AFF0'
const FANSLY_BRAND_HEX = '#009FFF'

interface DashboardHeroProps {
  planLabel: string | null
  hasConnectedPlatforms: boolean
  /** Per-platform connection (hero marks); OF also requires usable partner billing id in `ConnectedPlatforms`. */
  connectedOnlyFans?: boolean
  connectedFansly?: boolean
  mood?: DivineDashboardPreset['mood']
  accent?: DivineDashboardPreset['accent']
  tierIndex?: number | null
  /** Divine trial not started — card on file still required (same bar as Billing “Start trial”). */
  showStartTrialBillingCta?: boolean
  nonApiProtectionTier?: boolean
}

function heroGradient(accent: DivineDashboardPreset['accent'] | undefined): string {
  if (accent === 'circe') return 'from-circe/[0.05] via-transparent to-circe/[0.02]'
  if (accent === 'venus') return 'from-venus/[0.05] via-transparent to-venus/[0.02]'
  if (accent === 'gold') return 'from-gold/[0.04] via-transparent to-amber-500/[0.02]'
  return 'from-circe/[0.04] via-transparent to-venus/[0.03]'
}

function titleGradient(accent: DivineDashboardPreset['accent'] | undefined): string {
  if (accent === 'circe') return 'from-circe via-foreground to-circe/80'
  if (accent === 'venus') return 'from-venus via-foreground to-gold'
  if (accent === 'gold') return 'from-gold via-foreground to-amber-600'
  return 'from-circe via-foreground to-gold'
}

function HeroPlatformLogoMark({
  connected,
  src,
  alt,
  brandHex,
  width,
  height,
}: {
  connected: boolean
  src: string
  alt: string
  brandHex: string
  width: number
  height: number
}) {
  return (
    <div
      className={cn(
        'relative flex h-9 w-[4.25rem] shrink-0 items-center justify-center rounded-lg px-2 transition-[opacity,filter,box-shadow,border-color]',
        connected
          ? 'opacity-100 [filter:none]'
          : 'opacity-[0.42] grayscale contrast-[0.92]',
      )}
      style={
        connected
          ? {
              boxShadow: `0 0 0 1px ${brandHex}4d, 0 0 12px -1px ${brandHex}8c, 0 0 20px -4px ${brandHex}59`,
            }
          : { boxShadow: 'inset 0 0 0 1px oklch(0.5 0.01 84 / 0.12)' }
      }
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="h-[1.125rem] w-auto max-w-[3.5rem] object-contain dark:brightness-[1.05]"
      />
    </div>
  )
}

export function DashboardHero({
  planLabel,
  hasConnectedPlatforms,
  connectedOnlyFans = false,
  connectedFansly = false,
  mood,
  accent,
  tierIndex,
  nonApiProtectionTier = false,
  showStartTrialBillingCta = false,
}: DashboardHeroProps) {
  const t = useTranslations('dashboard.home')
  const tPlatforms = useTranslations('dashboard.connectedPlatformsWidget')
  const bg = heroGradient(accent)
  const title = titleGradient(accent)
  const subtitle =
    mood === 'minimal'
      ? t('subtitleMinimal')
      : mood === 'creative'
        ? t('subtitleCreative')
        : t('subtitleDefault')
  const tierBand =
    tierIndex != null && Number.isFinite(tierIndex) ? Math.max(0, Math.min(10, Math.floor(tierIndex))) : null
  const tierGlow =
    tierBand === null ? 'bg-circe/12' : tierBand <= 4 ? 'bg-circe/15' : tierBand <= 8 ? 'bg-gold/12' : 'bg-venus/14'

  return (
    <div
      id="dashboard-platform-sync"
      className={cn(
        'relative scroll-mt-24 overflow-hidden rounded-2xl border border-white/[0.2] bg-white/[0.08] p-7 shadow-none backdrop-blur-[10px] backdrop-saturate-[1.05] md:p-10',
        'dark:border-white/[0.09] dark:bg-white/[0.02]',
        'bg-gradient-to-br',
        bg,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full blur-[80px] opacity-30 md:h-56 md:w-56 md:opacity-35',
          tierGlow,
        )}
      />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-52 w-52 rounded-full bg-venus/[0.025] blur-[88px] dark:bg-venus/[0.035]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent dark:via-white/[0.1]" aria-hidden />
      <div className="relative flex flex-col gap-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/75">
              {t('eyebrow')}
            </p>
            <h1 className="mt-3.5 text-balance font-sans text-[1.7rem] font-semibold leading-[1.08] tracking-[-0.035em] text-foreground md:text-[2.45rem] md:leading-[1.05]">
              <span className="text-foreground">{t('titleLead')}</span>
              <span className={cn('bg-gradient-to-r bg-clip-text text-transparent', title)}>{t('titleAccent')}</span>
            </h1>
            <p className="mt-4 max-w-[34rem] text-[0.9375rem] font-normal leading-relaxed text-muted-foreground md:text-[1.015rem] md:leading-[1.55]">
              {subtitle}
            </p>
            {nonApiProtectionTier ? (
              <p className="mt-4 max-w-[34rem] text-sm leading-relaxed text-muted-foreground">
                {t('nonApiUpgrade')}{' '}
                <Link
                  href="/dashboard/settings?tab=billing"
                  className="font-medium text-foreground underline decoration-primary/35 underline-offset-[5px] transition-colors hover:text-primary"
                >
                  {t('nonApiUpgradeLink')}
                </Link>
                .
              </p>
            ) : (
              !hasConnectedPlatforms && (
                <p className="mt-4 text-sm leading-relaxed text-amber-800/90 dark:text-amber-400/95">
                  <Link
                    href="/dashboard/settings?tab=integrations"
                    className="font-medium text-gold underline decoration-gold/40 underline-offset-[5px] transition-colors hover:text-foreground hover:decoration-foreground/30 dark:text-gold"
                  >
                    {t('connectPlatforms')}
                  </Link>{' '}
                  {t('connectPlatformsSuffix')}
                </p>
              )
            )}
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-4 sm:flex-row sm:items-end sm:justify-end sm:gap-5">
            {showStartTrialBillingCta ? (
              <RainbowSparklePill
                href="/dashboard/settings?tab=billing"
                label={t('trialCtaLabel')}
                title={t('trialCtaTitle')}
                aria-label={t('trialCtaAria')}
              />
            ) : planLabel ? (
              <span className="inline-flex items-center justify-center rounded-full border border-black/[0.06] bg-white/[0.35] px-3.5 py-1.5 text-[11px] font-medium text-muted-foreground backdrop-blur-sm dark:border-white/[0.08] dark:bg-white/[0.05] sm:justify-start">
                {t('planPrefix')}
                <span className="ml-1.5 tabular-nums text-foreground">{planLabel}</span>
              </span>
            ) : null}
            {!nonApiProtectionTier ? (
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-col items-end gap-1.5">
                  <div
                    className="flex items-center justify-end gap-2.5"
                    role="group"
                    aria-label={t('connectedPlatformsAria')}
                  >
                    <HeroPlatformLogoMark
                      connected={connectedOnlyFans}
                      src={ONLYFANS_LOGO_SRC}
                      alt={tPlatforms('onlyfansLogoAlt')}
                      brandHex={ONLYFANS_BRAND_HEX}
                      width={120}
                      height={24}
                    />
                    <HeroPlatformLogoMark
                      connected={connectedFansly}
                      src={FANSLY_LOGO_SRC}
                      alt={tPlatforms('fanslyLogoAlt')}
                      brandHex={FANSLY_BRAND_HEX}
                      width={100}
                      height={24}
                    />
                  </div>
                  <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/75 sm:block">
                    {t('connectedPlatforms')}
                  </span>
                </div>
                <ConnectedPlatforms />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
