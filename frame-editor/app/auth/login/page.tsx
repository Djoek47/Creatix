'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MarkitSeal } from '@/components/markit/markit-seal'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const sp = useSearchParams()
  const next = sp.get('next') || '/welcome'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }
    router.push(next)
    router.refresh()
  }

  return (
    <div className="grid min-h-screen bg-[var(--background)] text-[var(--foreground)] lg:grid-cols-[1.2fr_0.8fr]">
      <aside className="relative hidden overflow-hidden border-r lg:flex lg:flex-col lg:items-center lg:justify-center" style={{ borderColor: 'var(--border)' }}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(900px 600px at 25% 30%, color-mix(in oklch, var(--circe) 14%, transparent), transparent 60%), radial-gradient(700px 500px at 75% 70%, color-mix(in oklch, var(--primary) 10%, transparent), transparent 60%)',
          }}
        />
        <div className="absolute left-7 top-7 flex items-center gap-3">
          <MarkitSeal size={30} />
          <p className="font-serif-display text-xs tracking-[0.22em]">
            CIRCE <em className="text-[var(--primary)]">et</em> VENUS
          </p>
        </div>
        <div className="relative flex flex-col items-center">
          <MarkitSeal size={280} />
          <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.36em] text-[var(--primary)]">Markit · The Divine Editor</p>
          <h1 className="font-serif-display mt-4 text-center text-4xl leading-tight">
            Speak it into <em className="text-[var(--primary)]">existence.</em>
          </h1>
          <p className="text-muted-foreground mt-3 text-center text-base italic">Voice-first editing. Recipient-bound trace export.</p>
        </div>
      </aside>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-xl border bg-[var(--card-2)] p-8" style={{ borderColor: 'var(--border)' }}>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--primary)]">Sign in</p>
          <h2 className="font-serif-display text-3xl">
            Return to the <em className="text-[var(--primary)]">editor</em>
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Pick up where you left off — your library, timelines, and traces are waiting.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div>
              <label className="text-muted-foreground mb-1 block font-mono text-[9px] uppercase tracking-[0.22em]">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm outline-none"
                style={{ borderColor: 'var(--border)' }}
                placeholder="you@domain.com"
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block font-mono text-[9px] uppercase tracking-[0.22em]">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm outline-none"
                style={{ borderColor: 'var(--border)' }}
                placeholder="••••••••"
              />
            </div>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[var(--primary)] py-2.5 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
            >
              {loading ? 'Entering…' : 'Enter Markit'}
            </button>
          </form>

          <p className="text-muted-foreground mt-6 text-center text-xs">
            Prefer legacy signin? <Link href="/auth/sign-in" className="underline">Open minimal sign in</Link>
          </p>
        </div>
      </section>
    </div>
  )
}

