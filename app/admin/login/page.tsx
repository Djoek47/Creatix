'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ThemedLogo } from '@/components/themed-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function AdminLoginPage() {
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

    try {
      const pre = await fetch('/api/admin/login-precheck', { method: 'POST' })
      if (pre.status === 429) {
        const j = (await pre.json().catch(() => null)) as { error?: string } | null
        setError(j?.error ?? 'Too many sign-in attempts. Try again later.')
        setLoading(false)
        return
      }
    } catch {
      // continue if precheck fails (e.g. offline); primary limit is Supabase
    }

    const supabase = createClient()
    const { error: signErr } = await supabase.auth.signInWithPassword({ email, password })
    if (signErr) {
      setError(signErr.message)
      setLoading(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('Could not load session.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (String((profile as { role?: string } | null)?.role ?? '').toLowerCase() !== 'admin') {
      await supabase.auth.signOut()
      setError('This account is not an administrator.')
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/10 via-circe/5 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      </div>

      <Link
        href="/"
        className="absolute left-6 top-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
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
            CIRCE ET VENUS
          </h1>
          <p className="text-xs text-muted-foreground">Internal administration</p>
        </div>
      </div>

      <Card className="w-full max-w-md border-primary/20 bg-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Admin sign in</CardTitle>
          <CardDescription>Authorized staff only</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="min-h-[44px] border-border bg-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Creator login:{' '}
            <Link href="/auth/login" className="font-medium text-primary hover:underline">
              /auth/login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
