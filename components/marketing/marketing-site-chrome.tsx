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

const footerNavExtras = [
  { href: '/about', label: 'About' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
] as const

const footerLinks = [...nav, ...footerNavExtras]

export function MarketingSiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/'
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="relative min-h-screen min-w-0 overflow-x-hidden bg-background constellation-bg">
      <div className="marketing-aurora" aria-hidden />

      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65">
        <nav className="relative mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:h-16 sm:px-6">
          <Link
            href="/"
            className="flex min-w-0 shrink-0 items-center gap-2.5 rounded-lg outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/60 sm:gap-3"
          >
            <MarketingBrandLogo width={36} height={36} className="shrink-0 sm:h-10 sm:w-10" variant="header" priority />
            <span className="hidden truncate font-serif text-[0.9375rem] font-semibold leading-none tracking-[0.12em] text-foreground sm:inline sm:text-base">
              CIRCE ET VENUS
            </span>
          </Link>
          <div className="hidden flex-1 items-center justify-center gap-0.5 md:flex">
            {nav.map((item) => {
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link key={item.href} href={item.href}>
                  <span
                    className={cn(
                      'block rounded-lg px-3 py-2 text-[13px] tracking-[-0.01em] transition-colors',
                      active
                        ? 'font-semibold text-foreground'
                        : 'font-medium text-muted-foreground hover:text-foreground/88',
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
          <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
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
                          'rounded-lg px-4 py-3.5 text-[15px] font-medium tracking-[-0.015em] transition-colors',
                          active
                            ? 'bg-muted/70 text-foreground'
                            : 'text-muted-foreground hover:bg-muted/45 hover:text-foreground',
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
                    className="h-11 w-full gap-2 rounded-xl bg-foreground text-background shadow-none hover:bg-foreground/90"
                    asChild
                  >
                    <Link href="/auth/sign-up" onClick={() => setMobileNavOpen(false)}>
                      Get started <ArrowRight className="h-4 w-4 opacity-90" aria-hidden />
                    </Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/auth/login" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:bg-transparent hover:text-foreground">
                Sign in
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button
                size="sm"
                className="h-9 gap-1.5 rounded-lg bg-foreground px-3.5 text-[13px] font-medium tracking-[-0.01em] text-background shadow-none hover:bg-foreground/90 sm:px-4"
              >
                <span className="hidden sm:inline">Get started</span>
                <span className="sm:hidden">Start</span>
                <ArrowRight className="h-3.5 w-3.5 opacity-90" aria-hidden />
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {children}

      <footer className="relative z-10 border-t border-border/35 bg-background/30 px-4 py-12 backdrop-blur-[2px] sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 sm:gap-12 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start lg:gap-16">
            <div className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-left">
              <div className="flex items-center gap-2.5">
                <MarketingBrandLogo width={36} height={36} className="shrink-0" variant="header" />
                <span className="font-serif text-[1.0625rem] font-semibold leading-none tracking-[0.12em] text-foreground sm:text-lg">
                  CIRCE ET VENUS
                </span>
              </div>
              <p className="max-w-[30ch] text-[13px] leading-relaxed text-muted-foreground sm:max-w-[34ch]">
                One workspace for OnlyFans and Fansly—messages, fans, AI tools, and protection, with voice-first Divine
                Manager.
              </p>
            </div>
            <div className="flex flex-col items-center gap-5 sm:items-end">
              <nav
                className="flex max-w-full flex-wrap justify-center gap-x-7 gap-y-2.5 sm:justify-end"
                aria-label="Footer"
              >
                {footerLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <MarketingFooterThemeIcon />
            </div>
          </div>
          <FooterSupportSocial className="mt-10 border-t border-border/25 pt-10 sm:mt-12 sm:pt-12" />
          <p className="mt-8 text-center text-[11px] leading-relaxed tracking-[0.02em] text-muted-foreground/90 sm:mt-10">
            © {new Date().getFullYear()} Circe et Venus Inc.
          </p>
        </div>
      </footer>
    </div>
  )
}
