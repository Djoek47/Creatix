'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ThemedLogo } from '@/components/themed-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function ForgotPasswordPage() {
  const tAuth = useTranslations('auth')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : undefined
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/10 via-circe/5 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      </div>

      <Link
        href="/auth/login"
        className="absolute left-6 top-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {tAuth('backToLogin')}
      </Link>

      <div className="mb-8 flex flex-col items-center gap-4">
        <ThemedLogo width={120} height={120} className="rounded-full" priority />
        <div className="text-center">
          <h1
            className={cn(
              'font-serif text-2xl font-bold tracking-wider text-primary',
              mounted && 'dark:text-circe-light',
            )}
          >
            {tAuth('authBrandLockup')}
          </h1>
          <p className="text-xs text-muted-foreground">{tAuth('authBrandTagline')}</p>
        </div>
      </div>

      <Card className="w-full max-w-md border-primary/20 bg-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{tAuth('forgotTitle')}</CardTitle>
          <CardDescription>
            {sent ? tAuth('forgotDescriptionAfterSent') : tAuth('forgotDescriptionBeforeSent')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 rounded-lg bg-primary/10 p-4 text-primary">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">{tAuth('forgotCheckInboxBadge')}</span>
              </div>
              <p className="text-center text-sm text-muted-foreground">{tAuth('forgotAfterSentHint')}</p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/auth/login">{tAuth('backToLogin')}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">{tAuth('emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={tAuth('emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="min-h-[44px] border-border bg-input"
                />
              </div>
              <Button
                type="submit"
                className={cn(
                  'w-full bg-primary text-primary-foreground hover:bg-primary/90',
                  mounted && 'dark:bg-circe dark:hover:bg-circe/90',
                )}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tAuth('forgotSending')}
                  </>
                ) : (
                  tAuth('forgotSubmit')
                )}
              </Button>
            </form>
          )}

          {!sent && (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              {tAuth('forgotRememberPassword')}{' '}
              <Link href="/auth/login" className="font-medium text-primary hover:underline">
                {tAuth('signInShort')}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
