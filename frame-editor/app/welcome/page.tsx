'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MarkitSeal } from '@/components/markit/markit-seal'

export default function WelcomePage() {
  const router = useRouter()

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timeout = window.setTimeout(
      () => {
        router.push('/editor')
      },
      reducedMotion ? 600 : 5300,
    )
    return () => window.clearTimeout(timeout)
  }, [router])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(900px 700px at 50% 50%, color-mix(in oklch, var(--circe) 16%, transparent), transparent 60%), radial-gradient(500px 400px at 20% 30%, color-mix(in oklch, var(--primary) 10%, transparent), transparent 60%)',
        }}
      />
      <button
        onClick={() => router.push('/editor')}
        className="absolute right-5 top-5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]"
        style={{ borderColor: 'var(--border)' }}
      >
        Skip
      </button>
      <div className="relative flex flex-col items-center">
        <div className="relative">
          <div
            className="absolute -inset-10 animate-pulse rounded-full"
            style={{
              background: 'radial-gradient(circle, color-mix(in oklch, var(--primary) 20%, transparent), transparent 70%)',
            }}
          />
          <MarkitSeal size={240} />
        </div>
        <div className="mt-14 text-center">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.36em] text-[var(--primary)]">Welcome back</p>
          <h1 className="font-serif-display text-5xl leading-tight">
            The <em className="text-[var(--primary)]">editor</em> awaits.
          </h1>
          <p className="text-muted-foreground mt-4 text-lg italic">Your Vault is loaded. Your voice is live.</p>
          <div className="mx-auto mt-10 h-px w-52 overflow-hidden rounded bg-[var(--border)]">
            <div className="h-full w-0 animate-[grow_1.8s_ease-out_forwards] bg-[var(--primary)]" />
          </div>
          <p className="text-muted-foreground mt-3 font-mono text-[9px] uppercase tracking-[0.24em]">
            Summoning the Divine Manager…
          </p>
        </div>
      </div>
      <style jsx>{`
        @keyframes grow {
          to {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}

