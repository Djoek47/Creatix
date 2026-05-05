'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ThemedLogo } from '@/components/themed-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthPasswordField } from '@/components/auth/auth-password-field'
import { LoginMfaChallenge } from '@/components/auth/login-mfa-challenge'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { AuthScenicBackdrop } from '@/components/auth/auth-scenic-backdrop'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  DEFAULT_TRIAL_SIGNUP_HREF,
  useSignupEntranceMode,
  useTrialSignupTransition,
} from '@/components/marketing/trial-signup-transition'
import { safePostAuthPath } from '@/lib/auth/safe-post-auth-path'

type LoginStep = 'credentials' | 'mfa'

export default function LoginPage() {
  const { beginSignupTransition, isTransitioning: authNavBusy } = useTrialSignupTransition()
  const entranceMode = useSignupEntranceMode()
  const reduceEntranceMotion = useReducedMotion()
  const instantEntrance = entranceMode === 'off' || reduceEntranceMotion
  const staged = entranceMode === 'staged'

  const tAuth = useTranslations('auth')
  const tCommon = useTranslations('common')
  const [step, setStep] = useState<LoginStep>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next')
  const postAuthPath = useMemo(() => safePostAuthPath(nextParam), [nextParam])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: signError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signError) {
      setError(signError.message)
      setLoading(false)
      return
    }

    const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aalError) {
      setError(aalError.message)
      setLoading(false)
      return
    }

    if (aal?.nextLevel === 'aal2' && aal.currentLevel !== aal.nextLevel) {
      setStep('mfa')
      setLoading(false)
      return
    }

    router.push(postAuthPath)
    router.refresh()
  }

  function handleMfaVerified() {
    router.push(postAuthPath)
    router.refresh()
  }

  function handleUseDifferentAccount() {
    setStep('credentials')
    setPassword('')
    setError(null)
  }

  const badCredentials = Boolean(error?.toLowerCase().includes('invalid login credentials'))

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 z-0">
        <AuthScenicBackdrop />
      </div>

      <div
        className={cn(
          'relative z-10 flex min-h-screen min-w-0 flex-1 flex-col items-center justify-center overflow-hidden pb-[calc(4rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[calc(4rem+env(safe-area-inset-top))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))]',
          staged && 'pointer-events-none select-none',
        )}
      >
        <motion.div
          initial={instantEntrance ? { x: 0, opacity: 1 } : { x: -36, opacity: 0 }}
          animate={
            instantEntrance
              ? { x: 0, opacity: 1 }
              : staged
                ? { x: -36, opacity: 0 }
                : { x: 0, opacity: 1 }
          }
          transition={{
            duration: instantEntrance ? 0 : 0.55,
            delay: instantEntrance ? 0 : 0.06,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="absolute left-[max(1.25rem,env(safe-area-inset-left))] top-[max(1.25rem,env(safe-area-inset-top))] z-10 sm:left-8 sm:top-8"
        >
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 opacity-70" />
            {tCommon('back')}
          </Link>
        </motion.div>

        <motion.div
          initial={instantEntrance ? { y: 0, opacity: 1 } : { y: -28, opacity: 0 }}
          animate={
            instantEntrance
              ? { y: 0, opacity: 1 }
              : staged
                ? { y: -28, opacity: 0 }
                : { y: 0, opacity: 1 }
          }
          transition={{
            duration: instantEntrance ? 0 : 0.55,
            delay: instantEntrance ? 0 : 0.1,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="relative z-10 mb-10 flex flex-col items-center gap-5 sm:mb-12"
        >
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
        </motion.div>

        <motion.div
          initial={instantEntrance ? { y: 0, opacity: 1 } : { y: 40, opacity: 0 }}
          animate={
            instantEntrance
              ? { y: 0, opacity: 1 }
              : staged
                ? { y: 40, opacity: 0 }
                : { y: 0, opacity: 1 }
          }
          transition={{
            duration: instantEntrance ? 0 : 0.58,
            delay: instantEntrance ? 0 : 0.14,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="relative z-10 w-full max-w-[420px]"
        >
      <Card
        className={cn(
          'relative z-10 w-full gap-0 overflow-hidden rounded-3xl py-0',
          'border border-white/50 bg-white/55 shadow-[0_24px_80px_-20px_rgba(15,23,42,0.18)] backdrop-blur-2xl',
          'dark:border-white/[0.12] dark:bg-slate-950/45 dark:shadow-[0_28px_90px_-24px_rgba(0,0,0,0.65)] dark:backdrop-blur-2xl',
        )}
      >
        <CardHeader className="space-y-2 px-5 pb-0 pt-10 text-left sm:px-8">
          <CardTitle className="font-serif text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-foreground sm:text-3xl">
            {step === 'mfa' ? tAuth('mfaLoginTitle') : tAuth('loginTitle')}
          </CardTitle>
          <CardDescription className="text-[15px] leading-relaxed text-muted-foreground">
            {step === 'mfa' ? tAuth('mfaLoginSubtitle') : tAuth('loginCardSubtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-10 pt-8 sm:px-8">
          {step === 'mfa' ? (
            <LoginMfaChallenge
              email={email}
              onVerified={handleMfaVerified}
              onUseDifferentAccount={handleUseDifferentAccount}
            />
          ) : null}
          {step === 'credentials' ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-destructive/20 bg-destructive/[0.06] px-4 py-3.5 text-sm text-destructive"
              >
                <div className="flex gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium leading-snug text-destructive">
                      {badCredentials
                        ? tAuth('loginErrorBadCredentialsTitle')
                        : tAuth('loginErrorGenericTitle')}
                    </p>
                    <p className="text-xs leading-relaxed text-destructive/85">
                      {badCredentials ? tAuth('loginErrorBadCredentialsDetail') : error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[13px] font-medium text-foreground">
                {tAuth('emailLabel')}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={tAuth('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12 rounded-xl border-border/80 bg-background/70 text-[15px] shadow-none transition-[border-color,box-shadow] focus-visible:border-foreground/25 focus-visible:ring-foreground/15 dark:bg-black/25"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="password" className="text-[13px] font-medium text-foreground">
                  {tAuth('passwordLabel')}
                </Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-[13px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground"
                >
                  {tAuth('forgotPassword')}
                </Link>
              </div>
              <AuthPasswordField
                id="password"
                placeholder={tAuth('passwordMaskedPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className={cn(
                'h-12 w-full rounded-xl text-[15px] font-medium tracking-tight shadow-none',
                'bg-foreground text-background hover:bg-foreground/88',
                'dark:bg-white dark:text-slate-950 dark:hover:bg-white/90',
                'transition-[opacity,background-color,transform] duration-200 active:scale-[0.99]',
                'disabled:opacity-50',
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin opacity-80" />
                  {tAuth('loggingIn')}
                </span>
              ) : (
                tAuth('continue')
              )}
            </Button>
          </form>
          ) : null}

          {step === 'credentials' ? (
          <p className="mt-8 text-center text-[15px] text-muted-foreground">
            {tAuth('loginNewHere')}{' '}
            <button
              type="button"
              disabled={authNavBusy}
              className="font-medium text-foreground underline-offset-4 transition-colors hover:underline disabled:pointer-events-none disabled:opacity-50"
              onClick={() => beginSignupTransition(DEFAULT_TRIAL_SIGNUP_HREF)}
            >
              {tAuth('loginCreateAccount')}
            </button>
          </p>
          ) : null}
        </CardContent>
      </Card>
        </motion.div>
      </div>
    </div>
  )
}
