'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, CheckCircle2, Loader2, Mail, Star } from 'lucide-react'
import { ThemedLogo } from '@/components/themed-logo'
import { createClient } from '@/lib/supabase/client'
import { Checkout } from '@/components/stripe/checkout'

type Phase = 'checking' | 'await-email' | 'confirmed'

export default function SignUpSuccessPage() {
  const [phase, setPhase] = useState<Phase>('checking')

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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-14">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-circe/5 to-transparent" />
      </div>

      <div className="mb-8 flex flex-col items-center gap-3">
        <ThemedLogo width={100} height={100} className="rounded-full" priority />
        <h1 className="font-serif text-xl font-bold tracking-wider text-primary">CIRCE ET VENUS</h1>
      </div>

      {phase === 'checking' ? (
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          <p className="text-sm">Checking your invite…</p>
        </div>
      ) : phase === 'await-email' ? (
        <Card className="w-full max-w-md border-primary/20 bg-card text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Star className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Check your inbox</CardTitle>
            <CardDescription>Confirm your email to unlock the realm.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We&apos;ve emailed you a verification link. After you confirm, you&apos;ll return here signed in—you can start
              your trial with a card next.
            </p>
            <div className="flex items-center justify-center gap-2 py-4">
              <Mail className="h-5 w-5 text-primary" />
              <span className="text-sm text-primary">Awaiting confirmation</span>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground">
                Check spam or promotions.{' '}
                <Link href="/auth/sign-up" className="text-primary hover:underline">
                  Resend signup
                </Link>
              </p>
            </div>
            <Link href="/auth/login">
              <Button variant="outline" className="w-full gap-2 border-primary/30 hover:bg-primary/10">
                Back to login <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-md border-primary/25 bg-card text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-2 ring-emerald-500/30">
              <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" aria-hidden />
            </div>
            <CardTitle className="text-2xl">You&apos;re confirmed</CardTitle>
            <CardDescription>Email verified—you&apos;re signed in. Finish setup below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Start the <strong className="text-foreground/90">2-day trial</strong> (card on file required). Credits and
              full workspace access unlock once your card is validated.
            </p>
            <Checkout
              productId="divine-trial"
              buttonText="Add card · start trial"
              buttonVariant="default"
              buttonClassName="h-12 w-full rounded-xl text-[15px] font-medium"
              onComplete={() => {
                window.location.href = '/dashboard'
              }}
            />
            <Link href="/dashboard">
              <Button variant="ghost" className="text-muted-foreground">
                Continue to dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
