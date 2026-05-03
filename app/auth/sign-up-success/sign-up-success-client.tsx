'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react'
import { ThemedLogo } from '@/components/themed-logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthScenicBackdrop } from '@/components/auth/auth-scenic-backdrop'
import { createClient } from '@/lib/supabase/client'
import { CheckoutEmbed } from '@/components/stripe/checkout'
import { TRIAL_PLAN_ID } from '@/lib/billing/access'
import { TRIAL_AI_CREDITS_LIMIT } from '@/lib/billing/credit-economics'
import { cn } from '@/lib/utils'

type Phase = 'checking' | 'await-email' | 'confirmed'

export function SignUpSuccessClient({
  trialBillingAttachedFromServer = false,
}: {
  trialBillingAttachedFromServer?: boolean
}) {
  const tAuth = useTranslations('auth')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('checking')
  const [trialCaptured, setTrialCaptured] = useState(false)

  useEffect(() => {
    const client = createClient()

    const applySession = (hasSession: boolean) => {
      setPhase(hasSession ? 'confirmed' : 'await-email')
    }

    void client.auth.getSession().then(({ data }) => applySession(!!data.session))

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      applySession(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const creditsLabel = TRIAL_AI_CREDITS_LIMIT.toLocaleString()
  const trialFlowCompleteOnServer =
    trialBillingAttachedFromServer && phase === 'confirmed'
  const showTrialSuccessUi = trialCaptured || trialFlowCompleteOnServer
  const needsTrialCheckoutCard = phase === 'confirmed' && !showTrialSuccessUi

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-16 sm:px-6">
      <AuthScenicBackdrop />

      <Link
        href="/auth/sign-up"
        className="absolute left-5 top-5 z-10 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:left-8 sm:top-8"
      >
        <ArrowLeft className="h-4 w-4 opacity-70" />
        {tCommon('back')}
      </Link>

      <div className="relative z-10 mb-10 flex flex-col items-center gap-5 sm:mb-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[-3rem] rounded-[3rem] bg-gradient-to-b from-violet-500/[0.07] via-transparent to-transparent blur-3xl dark:from-amber-400/[0.06]"
        />
        <ThemedLogo width={96} height={96} className="relative z-10 rounded-full" priority />
        <div className="relative z-10 text-center">
          <p className="font-serif text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            {tCommon('brand.name')}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground/90">{tCommon('brand.subtitle')}</p>
        </div>
      </div>

      {phase === 'checking' ? (
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
          <p className="text-[15px] text-muted-foreground">{tAuth('signUpCheckingSession')}</p>
        </div>
      ) : phase === 'await-email' ? (
        <Card
          className={cn(
            'relative z-10 w-full max-w-[420px] gap-0 overflow-hidden rounded-3xl py-0',
            'border border-white/50 bg-white/55 shadow-[0_24px_80px_-20px_rgba(15,23,42,0.18)] backdrop-blur-2xl',
            'dark:border-white/[0.12] dark:bg-slate-950/45 dark:shadow-[0_28px_90px_-24px_rgba(0,0,0,0.65)] dark:backdrop-blur-2xl',
          )}
        >
          <CardHeader className="space-y-2 px-8 pb-0 pt-10 text-left">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted/70 ring-1 ring-border/55">
              <Mail className="h-5 w-5 text-foreground/65" aria-hidden />
            </div>
            <CardTitle className="font-serif text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-foreground sm:text-3xl">
              {tAuth('signUpSuccessInboxTitle')}
            </CardTitle>
            <CardDescription className="text-[15px] leading-relaxed text-muted-foreground">
              {tAuth('signUpSuccessInboxSubtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-10 pt-8">
            <p className="text-[15px] leading-relaxed text-muted-foreground">{tAuth('signUpSuccessInboxBody')}</p>
            <div className="rounded-2xl border border-border/45 bg-muted/[0.14] px-4 py-3.5 dark:bg-white/[0.03]">
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {tAuth('signUpSuccessSpamHintBefore')}{' '}
                <Link href="/auth/sign-up" className="font-medium text-foreground underline-offset-4 hover:underline">
                  {tAuth('signUpSuccessResendSignup')}
                </Link>
              </p>
            </div>
            <Link href="/auth/login">
              <Button variant="outline" className="h-12 w-full rounded-xl border-border/70 text-[15px] font-medium shadow-none">
                {tAuth('backToLogin')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card
          className={cn(
            'relative z-10 w-full max-w-[420px] gap-0 overflow-hidden rounded-3xl py-0',
            'border border-white/50 bg-white/55 shadow-[0_24px_80px_-20px_rgba(15,23,42,0.18)] backdrop-blur-2xl',
            'dark:border-white/[0.12] dark:bg-slate-950/45 dark:shadow-[0_28px_90px_-24px_rgba(0,0,0,0.65)] dark:backdrop-blur-2xl',
          )}
        >
          <CardHeader className="space-y-2 px-8 pb-0 pt-10 text-left">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/[0.12] ring-1 ring-emerald-500/25">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" aria-hidden />
            </div>
            <CardTitle className="font-serif text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-foreground sm:text-3xl">
              {tAuth('signUpSuccessConfirmedTitle')}
            </CardTitle>
            <CardDescription className="text-[15px] leading-relaxed text-muted-foreground">
              {tAuth('signUpSuccessConfirmedSubtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-10 pt-8">
            {needsTrialCheckoutCard ? (
              <>
                <div className="rounded-2xl border border-border/45 bg-muted/[0.14] px-4 py-4 dark:bg-white/[0.03]">
                  <p className="text-center text-[13px] font-medium tracking-tight text-foreground">
                    {tAuth('signUpSuccessTrialBadge')}
                  </p>
                  <p className="mx-auto mt-2 max-w-[19rem] text-center text-[13px] leading-relaxed text-muted-foreground">
                    <span className="tabular-nums font-semibold text-foreground">{creditsLabel}</span>{' '}
                    {tAuth('signUpSuccessTrialCreditsTail')}
                  </p>
                  <div className="mt-5 min-h-[17rem] w-full overflow-hidden rounded-xl border border-border/40 bg-background/45 p-1 dark:bg-black/25">
                    <CheckoutEmbed
                      rootId="signup-success-trial-checkout"
                      productId={TRIAL_PLAN_ID}
                      className="min-h-[16rem] w-full"
                      onComplete={() => {
                        setTrialCaptured(true)
                        void router.refresh()
                      }}
                    />
                  </div>
                </div>
                <Link href="/dashboard" className="block">
                  <Button variant="ghost" className="h-11 w-full rounded-xl text-[14px] font-normal text-muted-foreground">
                    {tAuth('signUpSuccessContinueWithoutCard')}
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-emerald-500/[0.22] bg-emerald-500/[0.06] px-5 py-6 text-center dark:border-emerald-400/[0.18] dark:bg-emerald-400/[0.05]">
                  <p className="font-serif text-[2rem] font-semibold tabular-nums tracking-[-0.03em] text-foreground sm:text-[2.125rem]">
                    {creditsLabel}
                  </p>
                  <p className="mt-1 text-[14px] font-medium text-foreground">{tAuth('signUpSuccessCreditsAdded')}</p>
                  <p className="mx-auto mt-2 max-w-[19rem] text-[13px] leading-relaxed text-muted-foreground">
                    {tAuth('signUpSuccessTrialActiveBody')}
                  </p>
                </div>
                <Button
                  type="button"
                  className={cn(
                    'h-12 w-full rounded-xl text-[15px] font-medium tracking-tight shadow-none',
                    'bg-foreground text-background hover:bg-foreground/88',
                    'dark:bg-white dark:text-slate-950 dark:hover:bg-white/90',
                    'transition-[opacity,background-color,transform] duration-200 active:scale-[0.99]',
                  )}
                  onClick={() => {
                    router.push('/dashboard')
                    router.refresh()
                  }}
                >
                  {tAuth('signUpSuccessContinueDashboard')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
