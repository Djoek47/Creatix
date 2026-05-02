'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Link as IntlLink, usePathname } from '@/lib/i18n/navigation'
import { MarketingBrandLogo } from '@/components/marketing/marketing-brand-logo'
import { Button } from '@/components/ui/button'
import { FooterSupportSocial } from '@/components/marketing/footer-support-social'
import { MarketingFooterThemeIcon } from '@/components/marketing/marketing-footer-theme-icon'
import { MarketingLocaleSwitcher } from '@/components/marketing/marketing-locale-switcher'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ArrowRight, LogIn, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

const MAIN_NAV_HREFS = ['/', '/features', '/demo', '/mobile-app', '/pricing'] as const

export function MarketingSiteChrome({ children }: { children: ReactNode }) {
  const tNav = useTranslations('navigation')
  const tf = useTranslations('navigation.footerNav')
  const tCommon = useTranslations('common')
  const tm = useTranslations('marketing')
  const pathname = usePathname() ?? '/'
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const mainNavItems = MAIN_NAV_HREFS.map((href) => ({
    href,
    label:
      href === '/'
        ? tNav('marketingNav.home')
        : href === '/features'
          ? tNav('marketingNav.features')
          : href === '/demo'
            ? tNav('marketingNav.demo')
            : href === '/mobile-app'
              ? tNav('marketingNav.mobileApp')
              : tNav('marketingNav.pricing'),
  }))

  const footerExtraItems = [
    { href: '/about', label: tf('about') },
    { href: '/privacy', label: tf('privacy') },
    { href: '/terms', label: tf('terms') },
  ]

  function activeFor(itemHref: (typeof MAIN_NAV_HREFS)[number]): boolean {
    const p = pathname || '/'
    if (itemHref === '/') {
      return p === '/' || p === ''
    }
    return p === itemHref || p.startsWith(`${itemHref}/`)
  }

  return (
    <div className="relative min-h-screen min-w-0 bg-background constellation-bg">
      <div className="marketing-aurora" aria-hidden />

      <header className="fixed top-0 left-0 right-0 z-50 overflow-visible border-b border-border/40 bg-background/75 backdrop-blur-xl">
        <nav
          className={cn(
            'relative mx-auto flex h-14 w-full min-w-0 max-w-7xl items-center gap-2 sm:h-16 sm:gap-4',
            'pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]',
            'sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))]',
          )}
        >
          <IntlLink
            href="/"
            className="flex min-w-0 shrink-0 items-center gap-2 rounded-lg outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/60 sm:gap-3"
          >
            <MarketingBrandLogo
              width={36}
              height={36}
              className="size-8 shrink-0 sm:size-10"
              variant="header"
              priority
            />
            <span className="hidden truncate font-serif text-[0.9375rem] font-semibold leading-none tracking-[0.12em] text-primary sm:inline sm:text-base sm:tracking-[0.1em]">
              CIRCE ET VENUS
            </span>
          </IntlLink>
          <div className="hidden flex-1 items-center justify-center gap-0.5 md:flex">
            {mainNavItems.map((item) => {
              const active = activeFor(item.href as (typeof MAIN_NAV_HREFS)[number])
              return (
                <IntlLink key={item.href} href={item.href as (typeof MAIN_NAV_HREFS)[number]}>
                  <span
                    className={cn(
                      'relative block rounded-lg px-3 py-2 text-[13px] font-medium tracking-[-0.01em] transition-colors',
                      active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {active ? (
                      <span
                        className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-circe via-primary to-fuchsia-400 opacity-90"
                        aria-hidden
                      />
                    ) : null}
                    <span className="relative">{item.label}</span>
                  </span>
                </IntlLink>
              )
            })}
          </div>
          <div className="ml-auto flex min-w-0 shrink-0 items-center justify-end gap-0.5 sm:gap-2">
            <div className="hidden md:flex">
              <MarketingLocaleSwitcher variant="header" />
            </div>
            <Link
              href="/auth/login"
              className="hidden max-[379px]:inline-flex items-center md:hidden"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 text-foreground/85 hover:bg-muted/50"
                aria-label={tCommon('signIn')}
              >
                <LogIn className="h-5 w-5" aria-hidden />
              </Button>
            </Link>
            <Link href="/auth/login" className="hidden min-[380px]:inline-flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 shrink-0 px-1.5 text-[12px] font-medium text-foreground/85 hover:bg-transparent hover:text-foreground sm:px-3 sm:text-sm"
              >
                {tCommon('signIn')}
              </Button>
            </Link>
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label={tCommon('openMenu')}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex w-full max-w-sm flex-col gap-0 p-0">
                <SheetHeader className="border-b border-border/50 px-6 py-4 text-left">
                  <SheetTitle className="font-serif text-lg tracking-wider">{tCommon('menu')}</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-1 flex-col gap-0 overflow-y-auto px-2 py-2" aria-label="Main">
                  {mainNavItems.map((item) => {
                    const active = activeFor(item.href as (typeof MAIN_NAV_HREFS)[number])
                    return (
                      <IntlLink
                        key={item.href}
                        href={item.href as (typeof MAIN_NAV_HREFS)[number]}
                        onClick={() => setMobileNavOpen(false)}
                        className={cn(
                          'rounded-lg px-4 py-3.5 text-[15px] font-medium tracking-[-0.015em] transition-colors',
                          active
                            ? 'bg-primary/[0.12] text-primary'
                            : 'text-muted-foreground hover:bg-muted/45 hover:text-foreground',
                        )}
                      >
                        {item.label}
                      </IntlLink>
                    )
                  })}
                </nav>
                <div className="mt-auto space-y-2 border-t border-border/50 p-4">
                  <Button variant="outline" className="h-11 w-full" asChild>
                    <Link href="/auth/login" onClick={() => setMobileNavOpen(false)}>
                      {tCommon('signIn')}
                    </Link>
                  </Button>
                  <Button
                    className="h-11 w-full gap-2 rounded-xl bg-gradient-to-r from-primary via-primary to-circe/90 text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-[0.97]"
                    asChild
                  >
                    <Link href="/auth/sign-up" onClick={() => setMobileNavOpen(false)}>
                      {tCommon('getStarted')} <ArrowRight className="h-4 w-4 opacity-90" aria-hidden />
                    </Link>
                  </Button>
                  <MarketingLocaleSwitcher variant="footer" />
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/auth/sign-up" className="shrink-0">
              <Button
                size="sm"
                className="h-9 gap-1 whitespace-nowrap rounded-lg bg-gradient-to-r from-primary via-primary to-circe/90 px-2.5 text-[12px] font-medium tracking-[-0.01em] text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-[0.97] min-[400px]:gap-1.5 min-[400px]:px-3.5 min-[400px]:text-[13px] sm:px-4"
              >
                <span className="hidden sm:inline">{tCommon('getStarted')}</span>
                <span className="sm:hidden">{tCommon('start')}</span>
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 opacity-90 max-[360px]:hidden"
                  aria-hidden
                />
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      <div className="min-w-0 overflow-x-hidden">{children}</div>

      <footer className="relative z-10 border-t border-border/35 bg-background/30 px-4 py-12 backdrop-blur-[2px] sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 sm:gap-12 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start lg:gap-16">
            <div className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-left">
              <div className="flex items-center gap-2.5">
                <MarketingBrandLogo width={36} height={36} className="shrink-0" variant="header" />
                <span className="font-serif text-[1.0625rem] font-semibold leading-none tracking-[0.12em] text-primary sm:text-lg dark:text-circe-light">
                  CIRCE ET VENUS
                </span>
              </div>
              <p className="max-w-[30ch] text-[13px] leading-relaxed text-muted-foreground sm:max-w-[34ch]">
                {tm('footerTagline')}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
                  {tm('language')}
                </p>
                <MarketingLocaleSwitcher variant="footer" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-5 sm:items-end">
              <nav
                className="flex max-w-full flex-wrap justify-center gap-x-7 gap-y-2.5 sm:justify-end"
                aria-label={tm('footerNavigationAria')}
              >
                {[...mainNavItems, ...footerExtraItems.map((x) => ({ href: x.href, label: x.label }))].map((item) => {
                  const isLocalized = MAIN_NAV_HREFS.includes(item.href as (typeof MAIN_NAV_HREFS)[number])
                  const body = (
                    <span className="text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground">
                      {item.label}
                    </span>
                  )
                  if (isLocalized) {
                    return (
                      <IntlLink key={`m-${item.href}`} href={item.href as (typeof MAIN_NAV_HREFS)[number]}>
                        {body}
                      </IntlLink>
                    )
                  }
                  return (
                    <Link key={`f-${item.href}`} href={item.href}>
                      {body}
                    </Link>
                  )
                })}
              </nav>
              <MarketingFooterThemeIcon />
            </div>
          </div>
          <FooterSupportSocial className="mt-10 border-t border-border/25 pt-10 sm:mt-12 sm:pt-12" />
          <p className="mt-8 text-center text-[11px] leading-relaxed tracking-[0.02em] text-muted-foreground/90 sm:mt-10">
            {tCommon('copyright', { year: String(new Date().getFullYear()) })}
          </p>
        </div>
      </footer>
    </div>
  )
}
