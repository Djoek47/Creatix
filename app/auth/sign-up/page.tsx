'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ThemedLogo } from '@/components/themed-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthPasswordField } from '@/components/auth/auth-password-field'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { AuthScenicBackdrop } from '@/components/auth/auth-scenic-backdrop'
import { SignUpFeatureShowcase } from '@/components/auth/sign-up-feature-showcase'
import { createClient } from '@/lib/supabase/client'
import { getEmailConfirmationRedirectUrlClient } from '@/lib/supabase/email-confirmation-redirect'
import { cn } from '@/lib/utils'

export default function SignUpPage() {
  const [fullName, setFullName] = useState('')
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
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL?.trim() ||
          getEmailConfirmationRedirectUrlClient(),
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/auth/sign-up-success')
  }

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-background">
      {/* One continuous scenic + stars behind both columns */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <AuthScenicBackdrop />
      </div>

      {/* Left — form (matches login glass + typography) */}
      <div className="relative z-10 flex min-h-screen min-w-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16 sm:px-6">
        <Link
          href="/"
          className="absolute left-5 top-5 z-10 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:left-8 sm:top-8"
        >
          <ArrowLeft className="h-4 w-4 opacity-70" />
          Back
        </Link>

        <div className="relative z-10 mb-10 flex flex-col items-center gap-5 sm:mb-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[-3rem] rounded-[3rem] bg-gradient-to-b from-violet-500/[0.07] via-transparent to-transparent blur-3xl dark:from-amber-400/[0.06]"
          />
          <ThemedLogo width={96} height={96} className="relative z-10 rounded-full" priority />
          <div className="relative z-10 text-center">
            <p className="font-serif text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Circe et Venus
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground/90">Creator workspace</p>
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
              Create your account
            </CardTitle>
            <CardDescription className="text-[15px] leading-relaxed text-muted-foreground">
              Start with a 2-day trial. A card on file is required to activate billing after the trial.
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
                      <p className="font-medium leading-snug text-destructive">Unable to create your account</p>
                      <p className="text-xs leading-relaxed text-destructive/85">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-[13px] font-medium text-foreground">
                  Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                  className="h-12 rounded-xl border-border/80 bg-background/70 text-[15px] shadow-none transition-[border-color,box-shadow] focus-visible:border-foreground/25 focus-visible:ring-foreground/15 dark:bg-black/25"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[13px] font-medium text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-12 rounded-xl border-border/80 bg-background/70 text-[15px] shadow-none transition-[border-color,box-shadow] focus-visible:border-foreground/25 focus-visible:ring-foreground/15 dark:bg-black/25"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[13px] font-medium text-foreground">
                  Password
                </Label>
                <AuthPasswordField
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground">At least 8 characters.</p>
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
                    Creating account…
                  </span>
                ) : (
                  'Continue'
                )}
              </Button>
            </form>

            <p className="mt-8 text-center text-[15px] text-muted-foreground">
              Already have an account?{' '}
              <Link
                href="/auth/login"
                className="font-medium text-foreground underline-offset-4 transition-colors hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <SignUpFeatureShowcase />
    </div>
  )
}
