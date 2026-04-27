'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { MarketingBrandLogo } from '@/components/marketing/marketing-brand-logo'
import { Button } from '@/components/ui/button'
import { FooterSupportSocial } from '@/components/marketing/footer-support-social'
import { MarketingFooterThemeIcon } from '@/components/marketing/marketing-footer-theme-icon'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ArrowRight, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

const nav = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Features' },
  { href: '/demo', label: 'Demo' },
  { href: '/mobile-app', label: 'Mobile App' },
  { href: '/pricing', label: 'Pricing' },
] as const

export function MarketingSiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/'
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="relative min-h-screen min-w-0 overflow-x-hidden bg-background constellation-bg">
      <div className="marketing-aurora" aria-hidden />

      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/75 backdrop-blur-xl">
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
            <MarketingBrandLogo width={36} height={36} className="shrink-0 sm:h-10 sm:w-10" variant="header" priority />
            <span className="hidden truncate font-serif text-base font-semibold tracking-wider text-primary sm:inline sm:text-lg">
              CIRCE ET VENUS
            </span>
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link key={item.href} href={item.href}>
                  <span
                    className={cn(
                      'relative rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {active ? (
                      <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-circe via-primary to-fuchsia-400 opacity-90" />
                    ) : null}
                    <span className="relative">{item.label}</span>
                  </span>
                </Link>
              )
            })}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open site menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex w-full max-w-sm flex-col gap-0 p-0">
                <SheetHeader className="border-b border-border/50 px-6 py-4 text-left">
                  <SheetTitle className="font-serif text-lg tracking-wider">Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-1 flex-col gap-0 overflow-y-auto px-2 py-2" aria-label="Main">
                  {nav.map((item) => {
                    const active =
                      pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileNavOpen(false)}
                        className={cn(
                          'rounded-lg px-4 py-3.5 text-base font-medium transition-colors',
                          active
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground/90 hover:bg-muted/60',
                        )}
                      >
                        {item.label}
                      </Link>
                    )
                  })}
                </nav>
                <div className="mt-auto space-y-2 border-t border-border/50 p-4">
                  <Button variant="outline" className="h-11 w-full" asChild>
                    <Link href="/auth/login" onClick={() => setMobileNavOpen(false)}>
                      Sign in
                    </Link>
                  </Button>
                  <Button
                    className="h-11 w-full gap-2 bg-gradient-to-r from-primary via-primary to-circe/90 text-primary-foreground"
                    asChild
                  >
                    <Link href="/auth/sign-up" onClick={() => setMobileNavOpen(false)}>
                      Begin <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/auth/login" className="hidden sm:block">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'relative overflow-visible rounded-md text-foreground/85 !transition-colors duration-200',
                  'hover:!bg-background/55 hover:text-foreground',
                  'motion-safe:hover:animate-[divine-briefing-gold-purple-glow_2.6s_ease-in-out_infinite]',
                  'motion-reduce:hover:animate-none motion-reduce:hover:shadow-[0_0_0_1px_rgba(251,191,36,0.45),0_0_18px_rgba(139,92,246,0.35)]',
                )}
              >
                Sign in
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button
                size="sm"
                className="gap-1.5 bg-gradient-to-r from-primary via-primary to-circe/90 px-3 text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-[0.97] sm:px-4"
              >
                <span className="hidden sm:inline">Begin</span>
                <span className="sm:hidden">Start</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {children}

      <footer className="relative z-10 border-t border-border/40 bg-card/25 px-4 py-10 backdrop-blur-sm sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-8 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-3 sm:items-start">
              <div className="flex items-center gap-3">
                <MarketingBrandLogo width={36} height={36} className="marketing-float" variant="header" />
                <span className="font-serif text-lg font-semibold tracking-wider text-primary dark:text-circe-light">
                  CIRCE ET VENUS
                </span>
              </div>
              <p className="max-w-xs text-center text-sm text-muted-foreground sm:text-left">
                One workspace for OnlyFans and Fansly: messages, fans, AI tools, and protection — with voice-first Divine Manager.
              </p>
            </div>
            <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:items-end">
              <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm sm:justify-end">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link href="/about" className="text-muted-foreground transition-colors hover:text-primary">
                  About
                </Link>
                <Link href="/privacy" className="text-muted-foreground transition-colors hover:text-primary">
                  Privacy
                </Link>
                <Link href="/terms" className="text-muted-foreground transition-colors hover:text-primary">
                  Terms
                </Link>
              </nav>
              <MarketingFooterThemeIcon />
            </div>
          </div>
          <FooterSupportSocial className="mt-8" />
          <div className="mt-8 border-t border-border/30 pt-8 text-center">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Circe et Venus Inc. Guided by the stars. Built for creators.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
