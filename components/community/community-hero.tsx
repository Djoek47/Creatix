import Link from 'next/link'
import { Sparkles, Users, BookOpen, ArrowUpRight } from 'lucide-react'

const pillars = [
  { icon: Sparkles, label: 'Circe daily', hint: 'Fresh product nuggets' },
  { icon: Users, label: 'Creator tips', hint: 'Reviewed, real-world' },
  { icon: BookOpen, label: 'Best practices', hint: 'Feeds smarter tools' },
]

export function CommunityHero() {
  return (
    <section
      className="community-hero-mesh relative overflow-hidden border-b border-border/40"
      aria-labelledby="community-hero-title"
      data-tour="community-hero"
    >
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-circe/20 blur-3xl community-hero-drift" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl community-hero-drift-reverse" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
        style={{
          backgroundImage: `radial-gradient(circle at 15% 40%, oklch(0.6 0.18 295 / 0.25) 0%, transparent 45%),
            radial-gradient(circle at 90% 20%, oklch(0.75 0.14 85 / 0.2) 0%, transparent 40%)`,
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.15fr,0.85fr] lg:items-end lg:gap-10">
          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full border border-circe/25 bg-circe/10 px-3 py-1 text-xs font-medium text-circe">
              <Sparkles className="h-3.5 w-3.5 text-amber-500/90" aria-hidden />
              A space for the people who get it
            </p>
            <h1
              id="community-hero-title"
              className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              <span className="bg-gradient-to-r from-foreground via-foreground/90 to-circe bg-clip-text text-transparent">
                The Atrium
              </span>
            </h1>
            <p className="max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
              Trade workflows, small wins, and “why didn’t I think of that” moments with other Creatix users. Every public
              tip is reviewed; Circe’s daily notes live next door.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {pillars.map((p) => (
                <div
                  key={p.label}
                  className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-card/60 px-3 py-2 text-left shadow-sm backdrop-blur-sm"
                >
                  <p.icon className="h-4 w-4 shrink-0 text-circe" aria-hidden />
                  <div>
                    <p className="text-xs font-medium leading-none text-foreground">{p.label}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{p.hint}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/90 via-card/60 to-circe/5 p-4 shadow-sm backdrop-blur-sm sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Jump in</p>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                Scroll for approved tips, or add yours—moderation keeps quality high.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-circe" />
                Anonymized insights can inform Competitor Analysis—no names attached.
              </li>
            </ul>
            <Link
              href="/dashboard/community/circe-daily"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-circe transition-colors hover:text-circe/80"
            >
              Read today&apos;s Circe tips
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
