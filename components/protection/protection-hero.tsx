import Link from 'next/link'
import { Shield, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ProtectionHero() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/80 via-background to-fuchsia-950/40 p-6 sm:p-8 shadow-[0_0_60px_-12px_rgba(139,92,246,0.35)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, rgba(168,85,247,0.9) 0%, transparent 40%),
            radial-gradient(circle at 80% 30%, rgba(236,72,153,0.55) 0%, transparent 35%),
            linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)`,
        }}
      />
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-violet-600/10 blur-3xl" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200/90">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-300/90" />
            Circe Shield · leak search &amp; takedown desk
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-600/20 ring-1 ring-white/10">
              <Shield className="h-6 w-6 text-violet-100" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Your content stays yours
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Hunt infringing links, label scams and paywall traps, draft DMCAs, and keep a clean archive of what
                you already handled—so nothing slips through the cracks.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:flex-col lg:items-end">
          <Button
            asChild
            variant="secondary"
            className="border border-white/10 bg-background/40 backdrop-blur-sm hover:bg-background/60"
          >
            <Link href="/dashboard/protection/aegis">Aegis automation</Link>
          </Button>
          <Button asChild variant="outline" className="border-violet-400/30 text-violet-100 hover:bg-violet-500/10">
            <Link href="/dashboard/settings?tab=integrations">Integrations</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
