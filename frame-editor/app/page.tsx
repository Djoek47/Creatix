import Link from 'next/link'
import { MarkitSeal } from '@/components/markit/markit-seal'

export default function Page() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header
        className="sticky top-0 z-20 border-b backdrop-blur"
        style={{ borderColor: 'var(--border)', background: 'color-mix(in oklch, var(--background) 80%, transparent)' }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <MarkitSeal size={34} />
            <p className="font-serif-display text-sm tracking-[0.2em]">
              CIRCE <em className="text-[var(--primary)]">et</em> VENUS
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/auth/login" className="text-muted-foreground hover:text-white">
              Sign in
            </Link>
            <Link
              href="/auth/login"
              className="rounded-full bg-[var(--primary)] px-4 py-2 font-medium text-[var(--primary-foreground)]"
            >
              Begin
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-14">
        <section className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--primary)]">
              Markit · The Divine Editor
            </p>
            <h1 className="font-serif-display mb-5 text-5xl leading-[0.98] sm:text-6xl">
              Edit by <em className="text-[var(--primary)]">voice.</em>
              <br />
              Mark every <em className="text-[var(--primary)]">frame.</em>
            </h1>
            <p className="text-muted-foreground mb-8 max-w-xl text-lg">
              A voice-first video and image editor for adult creators. Speak the cut, ship the teaser, and bind every
              export to recipient-level trace attribution.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/auth/login"
                className="rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-[var(--primary-foreground)]"
              >
                Open the editor
              </Link>
              <Link href="/editor" className="rounded-full border px-6 py-3 text-sm" style={{ borderColor: 'var(--border)' }}>
                See workspace
              </Link>
              <Link href="/library" className="rounded-full border px-6 py-3 text-sm" style={{ borderColor: 'var(--border)' }}>
                Library
              </Link>
              <Link href="/vault" className="rounded-full border px-6 py-3 text-sm" style={{ borderColor: 'var(--border)' }}>
                Vault
              </Link>
            </div>
          </div>
          <div className="relative flex items-center justify-center py-8">
            <div
              className="absolute inset-0 m-auto h-[22rem] w-[22rem] rounded-full"
              style={{
                background: 'radial-gradient(circle, color-mix(in oklch, var(--primary) 14%, transparent), transparent 68%)',
              }}
            />
            <MarkitSeal size={280} />
          </div>
        </section>

        <section className="mt-16 grid gap-4 border-y py-10 sm:grid-cols-3" style={{ borderColor: 'var(--border)' }}>
          {[
            ['One voice', 'Say it, ship it'],
            ['Every frame', 'DCT trace layer'],
            ['Zero guesswork', 'Leaks traced to recipient'],
          ].map(([v, l]) => (
            <div key={v}>
              <p className="font-serif-display text-3xl text-[var(--primary)]">{v}</p>
              <p className="text-muted-foreground mt-1 font-mono text-[10px] uppercase tracking-[0.2em]">{l}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
