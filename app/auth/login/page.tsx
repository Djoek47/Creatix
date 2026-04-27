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
      {/* Scenic themed backdrop (night/day inspired) */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div
          className="login-scenic-bg absolute inset-0 bg-stone-100 dark:hidden"
          style={{ backgroundImage: "url('/publiclogin-bg-day.png.png')" }}
        />
        <div
          className="login-scenic-bg login-scenic-bg-night absolute inset-0 hidden bg-slate-950 dark:block"
          style={{ backgroundImage: "url('/publiclogin-bg-night.png.png')" }}
        />
        <div className="absolute left-[4%] top-[12%] h-[48vh] w-[28vw] min-w-56 [background-image:radial-gradient(circle_at_12%_18%,rgba(168,85,247,1)_1.8px,transparent_2px),radial-gradient(circle_at_30%_12%,rgba(255,255,255,0.98)_1.4px,transparent_1.6px),radial-gradient(circle_at_52%_30%,rgba(192,132,252,0.95)_1.5px,transparent_1.7px),radial-gradient(circle_at_72%_16%,rgba(168,85,247,0.98)_1.6px,transparent_1.8px),radial-gradient(circle_at_86%_34%,rgba(255,255,255,0.92)_1.4px,transparent_1.6px),radial-gradient(circle_at_18%_58%,rgba(192,132,252,0.96)_1.5px,transparent_1.7px),radial-gradient(circle_at_36%_78%,rgba(255,255,255,0.86)_1.2px,transparent_1.4px),radial-gradient(circle_at_64%_54%,rgba(168,85,247,0.9)_1.3px,transparent_1.5px),radial-gradient(circle_at_80%_66%,rgba(168,85,247,0.92)_1.5px,transparent_1.7px),radial-gradient(circle_at_48%_90%,rgba(255,255,255,0.86)_1.2px,transparent_1.4px),radial-gradient(circle_at_92%_82%,rgba(192,132,252,0.88)_1.2px,transparent_1.4px)] motion-safe:animate-[login-fairy-stars-a_6.2s_ease-in-out_infinite] dark:[background-image:radial-gradient(circle_at_12%_18%,rgba(251,191,36,1)_1.8px,transparent_2px),radial-gradient(circle_at_30%_12%,rgba(255,255,255,0.98)_1.4px,transparent_1.6px),radial-gradient(circle_at_52%_30%,rgba(251,191,36,0.95)_1.5px,transparent_1.7px),radial-gradient(circle_at_72%_16%,rgba(251,191,36,0.98)_1.6px,transparent_1.8px),radial-gradient(circle_at_86%_34%,rgba(255,255,255,0.92)_1.4px,transparent_1.6px),radial-gradient(circle_at_18%_58%,rgba(251,191,36,0.96)_1.5px,transparent_1.7px),radial-gradient(circle_at_36%_78%,rgba(255,255,255,0.86)_1.2px,transparent_1.4px),radial-gradient(circle_at_64%_54%,rgba(251,191,36,0.9)_1.3px,transparent_1.5px),radial-gradient(circle_at_80%_66%,rgba(251,191,36,0.92)_1.5px,transparent_1.7px),radial-gradient(circle_at_48%_90%,rgba(255,255,255,0.86)_1.2px,transparent_1.4px),radial-gradient(circle_at_92%_82%,rgba(251,191,36,0.88)_1.2px,transparent_1.4px)]" />
        <div className="absolute right-[4%] top-[10%] h-[50vh] w-[30vw] min-w-60 [background-image:radial-gradient(circle_at_14%_28%,rgba(168,85,247,1)_1.7px,transparent_1.9px),radial-gradient(circle_at_38%_10%,rgba(255,255,255,0.98)_1.4px,transparent_1.6px),radial-gradient(circle_at_58%_34%,rgba(255,255,255,0.9)_1.2px,transparent_1.4px),radial-gradient(circle_at_78%_20%,rgba(192,132,252,0.98)_1.6px,transparent_1.8px),radial-gradient(circle_at_90%_56%,rgba(255,255,255,0.94)_1.4px,transparent_1.6px),radial-gradient(circle_at_30%_74%,rgba(168,85,247,0.95)_1.5px,transparent_1.7px),radial-gradient(circle_at_50%_88%,rgba(255,255,255,0.84)_1.2px,transparent_1.4px),radial-gradient(circle_at_18%_88%,rgba(192,132,252,0.85)_1.2px,transparent_1.4px),radial-gradient(circle_at_68%_82%,rgba(168,85,247,0.92)_1.5px,transparent_1.7px),radial-gradient(circle_at_94%_18%,rgba(255,255,255,0.82)_1.1px,transparent_1.3px)] motion-safe:animate-[login-fairy-stars-b_7.4s_ease-in-out_infinite] dark:[background-image:radial-gradient(circle_at_14%_28%,rgba(251,191,36,1)_1.7px,transparent_1.9px),radial-gradient(circle_at_38%_10%,rgba(255,255,255,0.98)_1.4px,transparent_1.6px),radial-gradient(circle_at_58%_34%,rgba(255,255,255,0.9)_1.2px,transparent_1.4px),radial-gradient(circle_at_78%_20%,rgba(251,191,36,0.98)_1.6px,transparent_1.8px),radial-gradient(circle_at_90%_56%,rgba(255,255,255,0.94)_1.4px,transparent_1.6px),radial-gradient(circle_at_30%_74%,rgba(251,191,36,0.95)_1.5px,transparent_1.7px),radial-gradient(circle_at_50%_88%,rgba(255,255,255,0.84)_1.2px,transparent_1.4px),radial-gradient(circle_at_18%_88%,rgba(251,191,36,0.85)_1.2px,transparent_1.4px),radial-gradient(circle_at_68%_82%,rgba(251,191,36,0.92)_1.5px,transparent_1.7px),radial-gradient(circle_at_94%_18%,rgba(255,255,255,0.82)_1.1px,transparent_1.3px)]" />
        <div className="absolute inset-x-[16%] top-[6%] h-32 [background-image:radial-gradient(circle_at_8%_46%,rgba(168,85,247,0.98)_1.4px,transparent_1.6px),radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.88)_1.2px,transparent_1.4px),radial-gradient(circle_at_44%_54%,rgba(192,132,252,0.82)_1.1px,transparent_1.3px),radial-gradient(circle_at_68%_34%,rgba(168,85,247,0.9)_1.3px,transparent_1.5px),radial-gradient(circle_at_88%_66%,rgba(255,255,255,0.9)_1.2px,transparent_1.4px)] motion-safe:animate-[login-fairy-stars-a_8s_ease-in-out_infinite] dark:[background-image:radial-gradient(circle_at_8%_46%,rgba(251,191,36,0.98)_1.4px,transparent_1.6px),radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.88)_1.2px,transparent_1.4px),radial-gradient(circle_at_44%_54%,rgba(251,191,36,0.82)_1.1px,transparent_1.3px),radial-gradient(circle_at_68%_34%,rgba(251,191,36,0.9)_1.3px,transparent_1.5px),radial-gradient(circle_at_88%_66%,rgba(255,255,255,0.9)_1.2px,transparent_1.4px)]" />
        <div className="absolute left-[6%] top-[30%] hidden h-56 w-56 opacity-90 motion-safe:animate-[marketing-float-soft_7s_ease-in-out_infinite] sm:block">
          <svg viewBox="0 0 220 220" className="h-full w-full text-violet-500/90 drop-shadow-[0_0_20px_rgba(168,85,247,0.74)] motion-safe:animate-[login-constellation-fade_5s_ease-in-out_infinite] dark:text-amber-300/95 dark:drop-shadow-[0_0_20px_rgba(251,191,36,0.74)]">
            <path d="M30 150 70 92 118 116 164 58 192 100" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="opacity-50" />
            <circle cx="30" cy="150" r="3" fill="currentColor" />
            <circle cx="70" cy="92" r="2.5" fill="currentColor" />
            <circle cx="118" cy="116" r="2.5" fill="currentColor" />
            <circle cx="164" cy="58" r="3" fill="currentColor" />
            <circle cx="192" cy="100" r="2.5" fill="currentColor" />
          </svg>
        </div>
        <div className="absolute right-[7%] top-[20%] hidden h-60 w-60 opacity-85 motion-safe:animate-[marketing-float-soft_8s_ease-in-out_infinite] sm:block">
          <svg viewBox="0 0 240 240" className="h-full w-full text-violet-500/85 drop-shadow-[0_0_20px_rgba(168,85,247,0.7)] motion-safe:animate-[login-constellation-fade_5.8s_ease-in-out_infinite] dark:text-amber-300/90 dark:drop-shadow-[0_0_20px_rgba(251,191,36,0.7)]">
            <path d="M46 68 92 44 138 76 178 42 204 96 166 148 112 130 78 178" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="opacity-45" />
            <circle cx="46" cy="68" r="2.5" fill="currentColor" />
            <circle cx="92" cy="44" r="3" fill="currentColor" />
            <circle cx="138" cy="76" r="2.5" fill="currentColor" />
            <circle cx="178" cy="42" r="3" fill="currentColor" />
            <circle cx="204" cy="96" r="2.5" fill="currentColor" />
            <circle cx="166" cy="148" r="2.5" fill="currentColor" />
            <circle cx="112" cy="130" r="3" fill="currentColor" />
            <circle cx="78" cy="178" r="2.5" fill="currentColor" />
          </svg>
        </div>
      </div>

      <Link 
        href="/" 
        className="absolute left-6 top-6 z-10 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      {/* Logo */}
      <div className="relative z-10 mb-8 flex translate-y-[-clamp(1.25rem,3vh,2.5rem)] flex-col items-center gap-4">
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

      <Card className="relative z-10 w-full max-w-md translate-y-[-clamp(1.25rem,3vh,2.5rem)] border-primary/20 bg-card">
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
                "group group/aitools relative w-full overflow-hidden rounded-md border font-semibold tracking-[0.02em] text-primary-foreground transition-all duration-300",
                "border-violet-400/80 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-[length:220%_auto] text-zinc-950 shadow-[0_0_14px_-8px_rgba(251,191,36,0.72),0_0_20px_-14px_rgba(168,85,247,0.5)]",
                "motion-safe:animate-gradient-x motion-safe:hover:animate-[divine-briefing-gold-purple-glow_2.4s_ease-in-out_infinite]",
                "hover:-translate-y-0.5 hover:scale-[1.01] hover:brightness-110 active:translate-y-[1px] active:scale-[0.995]",
                "before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(115deg,transparent_15%,rgba(255,255,255,0.34)_50%,transparent_85%)] before:opacity-0 before:transition-opacity before:duration-300",
                "motion-safe:hover:before:animate-[shimmer_1.2s_ease-out] hover:before:opacity-100",
                "focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "disabled:!opacity-60 disabled:hover:translate-y-0 disabled:hover:scale-100",
                mounted &&
                  "dark:border-amber-300/80 dark:bg-gradient-to-r dark:from-violet-600 dark:via-fuchsia-600 dark:to-violet-500 dark:text-primary-foreground dark:shadow-[0_0_16px_-8px_rgba(251,191,36,0.8),0_0_24px_-14px_rgba(251,191,36,0.58)]",
              )}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entering the realm...
                </>
              ) : (
                <span className="ai-tools-wordmark brightness-125 drop-shadow-[0_0_10px_rgba(255,255,255,0.28)]">
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
