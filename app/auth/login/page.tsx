'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ThemedLogo } from '@/components/themed-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthPasswordField } from '@/components/auth/auth-password-field'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { AuthScenicBackdrop } from '@/components/auth/auth-scenic-backdrop'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const tAuth = useTranslations('auth')
  const tCommon = useTranslations('common')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const badCredentials = Boolean(error?.toLowerCase().includes('invalid login credentials'))

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-16 sm:px-6">
      <AuthScenicBackdrop />

      <Link
        href="/"
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

      <Card
        className={cn(
          'relative z-10 w-full max-w-[420px] gap-0 overflow-hidden rounded-3xl py-0',
          'border border-white/50 bg-white/55 shadow-[0_24px_80px_-20px_rgba(15,23,42,0.18)] backdrop-blur-2xl',
          'dark:border-white/[0.12] dark:bg-slate-950/45 dark:shadow-[0_28px_90px_-24px_rgba(0,0,0,0.65)] dark:backdrop-blur-2xl',
        )}
      >
        <CardHeader className="space-y-2 px-8 pb-0 pt-10 text-left">
          <CardTitle className="font-serif text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-foreground sm:text-3xl">
            {tAuth('loginTitle')}
          </CardTitle>
          <CardDescription className="text-[15px] leading-relaxed text-muted-foreground">
            {tAuth('loginCardSubtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-10 pt-8">
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

          <p className="mt-8 text-center text-[15px] text-muted-foreground">
            {tAuth('loginNewHere')}{' '}
            <Link
              href="/auth/sign-up"
              className="font-medium text-foreground underline-offset-4 transition-colors hover:underline"
            >
              {tAuth('loginCreateAccount')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
