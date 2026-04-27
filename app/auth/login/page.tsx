'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ThemedLogo } from '@/components/themed-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { AuthScenicBackdrop } from '@/components/auth/auth-scenic-backdrop'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

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

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      <AuthScenicBackdrop />

      <Link 
        href="/" 
        className="absolute left-6 top-6 z-10 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      {/* Logo */}
      <div className="relative z-10 mb-8 flex flex-col items-center gap-4">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-6 z-0 h-40 w-40 rounded-full bg-amber-300/30 blur-2xl dark:bg-violet-500/35"
        />
        <ThemedLogo
          width={120}
          height={120}
          className="relative z-10 rounded-full"
          priority
        />
        <div className="text-center">
          <h1 className={cn(
            "font-serif text-2xl font-bold tracking-wider text-primary",
            mounted && "dark:text-circe-light"
          )}>CIRCE ET VENUS</h1>
          <p className="text-xs text-muted-foreground">Divine Creator Management</p>
        </div>
      </div>

      <Card
        className={cn(
          'relative z-10 w-full max-w-md',
          /* Day: gold-lit rim */
          'border-amber-500/50 bg-card shadow-[0_0_0_1px_rgba(253,186,64,0.45),0_0_20px_rgba(251,191,36,0.1)]',
          /* Night: same gold edge + soft purple interior atmosphere */
          'dark:border-amber-300/55',
          'dark:bg-gradient-to-b dark:from-violet-950/90 dark:via-slate-950/95 dark:to-slate-950',
          'dark:shadow-[0_0_0_1px_rgba(252,211,77,0.5),0_0_32px_rgba(251,191,36,0.11),0_0_80px_rgba(76,29,149,0.22),inset_0_0_48px_rgba(88,28,135,0.12)]',
        )}
      >
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome Back, Creator</CardTitle>
          <CardDescription>
            The goddesses await your return
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/40 bg-gradient-to-r from-destructive/10 to-destructive/5 p-3 text-sm text-destructive shadow-[0_0_0_1px_rgba(239,68,68,0.12)]">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">
                      {error.toLowerCase().includes('invalid login credentials')
                        ? 'We couldn’t match that email and password.'
                        : 'Unable to sign in right now.'}
                    </p>
                    <p className="mt-0.5 text-xs text-destructive/90">
                      {error.toLowerCase().includes('invalid login credentials')
                        ? 'Please check your email and password, then try again or reset your password.'
                        : error}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-input border-border min-h-[44px]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link 
                  href="/auth/forgot-password" 
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-input border-border min-h-[44px]"
              />
            </div>

            <Button
              type="submit"
              className={cn(
                "login-realm-btn-ambient group group/aitools relative w-full overflow-hidden rounded-md border-2 font-semibold tracking-[0.02em] text-purple-900 transition-all duration-300",
                /* Day: gold fill + purple label; glow = login-realm-glow-day in globals */
                "border-amber-500/85 bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-300 bg-[length:220%_auto] hover:!bg-gradient-to-r hover:!from-amber-200 hover:!via-yellow-200 hover:!to-amber-300",
                /* Night: opposite — violet/fuchsia fill + gold label; glow = login-realm-glow-night (amber bloom) */
                "dark:border-violet-400/70 dark:ring-1 dark:ring-amber-400/25 dark:bg-gradient-to-r dark:from-violet-700 dark:via-fuchsia-800 dark:to-violet-900 dark:bg-[length:220%_auto]",
                "dark:hover:!bg-gradient-to-r dark:hover:!from-violet-600 dark:hover:!via-fuchsia-700 dark:hover:!to-violet-800",
                "hover:-translate-y-0.5 hover:scale-[1.01] hover:brightness-[1.02] active:translate-y-[1px] active:scale-[0.995]",
                "before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(115deg,transparent_15%,rgba(255,255,255,0.34)_50%,transparent_85%)] before:opacity-0 before:transition-opacity before:duration-300",
                "dark:before:bg-[linear-gradient(115deg,transparent_15%,rgba(252,211,77,0.18)_50%,transparent_85%)]",
                "motion-safe:hover:before:animate-[shimmer_1.2s_ease-out] hover:before:opacity-100",
                "focus-visible:ring-2 focus-visible:ring-violet-600/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-amber-300/70",
                "disabled:!opacity-60 disabled:hover:translate-y-0 disabled:hover:scale-100",
              )}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center text-purple-900 dark:text-amber-100">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entering the realm...
                </span>
              ) : (
                <span className="relative z-10 font-extrabold tracking-[0.04em] text-purple-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.35)] dark:text-amber-100 dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                  Enter the Realm
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {"New to the divine realm?"}{' '}
            <Link href="/auth/sign-up" className="font-medium text-primary hover:underline">
              Begin your journey
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
