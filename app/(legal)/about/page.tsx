'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'

import { AuthScenicBackdrop } from '@/components/auth/auth-scenic-backdrop'
import { FooterSupportSocial } from '@/components/marketing/footer-support-social'
import { ThemedLogo } from '@/components/themed-logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const glassShell = cn(
  'w-full max-w-[40rem] rounded-[2rem] border px-8 py-12 sm:px-12 sm:py-14 md:px-14 md:py-16',
  'border-white/50 bg-white/50 shadow-[0_24px_80px_-28px_rgba(15,23,42,0.14)] backdrop-blur-2xl',
  'dark:border-white/[0.09] dark:bg-slate-950/40 dark:shadow-[0_28px_90px_-32px_rgba(0,0,0,0.55)]',
)

const sectionRule = 'border-t border-border/25 pt-12 first:border-t-0 first:pt-0'

export default function AboutPage() {
  const t = useTranslations('about')
  const tCommon = useTranslations('common')

  return (
    <div className="relative min-h-screen min-w-0 overflow-x-hidden bg-background">
      <AuthScenicBackdrop />

      <header
        className={cn(
          'sticky top-0 z-20 border-b border-border/30 bg-background/70 backdrop-blur-xl',
          'supports-[backdrop-filter]:bg-background/55',
        )}
      >
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5 sm:h-[3.75rem] sm:px-8">
          <Link
            href="/"
            aria-label={t('nav.homeAria')}
            className="flex min-w-0 items-center gap-2.5 rounded-xl outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/50"
          >
            <ThemedLogo width={36} height={36} className="size-9 shrink-0 rounded-full" priority />
            <span className="truncate font-serif text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {tCommon('brand.name')}
            </span>
          </Link>
          <Button variant="ghost" size="sm" className="h-9 gap-1.5 rounded-full px-3 text-muted-foreground" asChild>
            <Link href="/" className="flex items-center gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5 opacity-70" aria-hidden />
              <span className="text-[13px] font-medium">{tCommon('back')}</span>
            </Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 pb-20 pt-10 sm:px-8 sm:pb-24 sm:pt-14">
        <div className={glassShell}>
          <header className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t('hero.kicker')}</p>
            <h1 className="font-serif text-[2.125rem] font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl sm:leading-[1.05]">
              {t('hero.title')}
            </h1>
            <p className="max-w-prose text-pretty text-[17px] leading-relaxed text-muted-foreground sm:text-lg">
              {t('hero.lead')}
            </p>
          </header>

          <section className={cn('mt-14 space-y-5', sectionRule)}>
            <h2 className="font-serif text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{t('mission.title')}</h2>
            <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              <p className="max-w-prose text-pretty">{t('mission.p1')}</p>
              <p className="max-w-prose text-pretty">{t('mission.p2')}</p>
            </div>
          </section>

          <section className={cn('mt-14 grid gap-10 sm:grid-cols-2 sm:gap-12', sectionRule)}>
            <div className="space-y-3 border-l-2 border-circe/25 pl-5 sm:pl-6">
              <h3 className="font-serif text-lg font-semibold tracking-tight text-foreground">{t('dual.circeTitle')}</h3>
              <p className="text-[15px] leading-relaxed text-muted-foreground">{t('dual.circeBody')}</p>
            </div>
            <div className="space-y-3 border-l-2 border-amber-400/25 pl-5 sm:pl-6 dark:border-amber-300/20">
              <h3 className="font-serif text-lg font-semibold tracking-tight text-foreground">{t('dual.venusTitle')}</h3>
              <p className="text-[15px] leading-relaxed text-muted-foreground">{t('dual.venusBody')}</p>
            </div>
          </section>

          <section className={cn('mt-14', sectionRule)}>
            <h2 className="font-serif text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{t('values.title')}</h2>
            <ul className="mt-8 grid gap-10 sm:grid-cols-3 sm:gap-8">
              <li className="space-y-2">
                <p className="text-[15px] font-medium leading-snug text-foreground">{t('values.oneTitle')}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{t('values.oneBody')}</p>
              </li>
              <li className="space-y-2">
                <p className="text-[15px] font-medium leading-snug text-foreground">{t('values.twoTitle')}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{t('values.twoBody')}</p>
              </li>
              <li className="space-y-2">
                <p className="text-[15px] font-medium leading-snug text-foreground">{t('values.threeTitle')}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{t('values.threeBody')}</p>
              </li>
            </ul>
          </section>

          <p className={cn('mt-14 text-sm leading-relaxed text-muted-foreground/90', sectionRule)}>{t('closing.line')}</p>

          <section className={cn('mt-14 space-y-5 text-center', sectionRule)}>
            <h2 className="font-serif text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{t('cta.title')}</h2>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">{t('cta.subtitle')}</p>
            <div className="flex flex-col items-stretch justify-center gap-3 pt-1 sm:flex-row sm:items-center sm:justify-center">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full bg-foreground px-8 text-[15px] font-medium text-background shadow-none hover:bg-foreground/90"
              >
                <Link href="/auth/sign-up">{t('cta.primary')}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 rounded-full border-border/60 bg-background/40 px-8 text-[15px] backdrop-blur-sm">
                <Link href="/contact">{t('cta.secondary')}</Link>
              </Button>
            </div>
          </section>
        </div>

        <footer className="mx-auto mt-16 w-full max-w-[40rem] space-y-6 pb-8 text-center sm:mt-20">
          <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[13px] text-muted-foreground">
            <Link href="/terms" className="transition-colors hover:text-foreground">
              {t('footer.terms')}
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              {t('footer.privacy')}
            </Link>
            <Link href="/cookies" className="transition-colors hover:text-foreground">
              {t('footer.cookies')}
            </Link>
            <Link href="/contact" className="transition-colors hover:text-foreground">
              {t('footer.contact')}
            </Link>
          </nav>
          <FooterSupportSocial className="justify-center opacity-90" />
        </footer>
      </main>
    </div>
  )
}
