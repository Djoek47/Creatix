import Link from 'next/link'
import { MessageSquare, Sparkles, Shield, HeartPulse, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'

const tiles = [
  {
    href: '/dashboard/messages',
    title: 'Messages',
    description: 'Conversations and mass outreach',
    icon: MessageSquare,
    accent: 'from-circe/20 to-circe/5 border-circe/25 hover:border-circe/45',
    iconClass: 'text-circe',
  },
  {
    href: '/dashboard/ai-studio',
    title: 'AI Studio',
    description: 'Tools, churn insight, and creative edge',
    icon: Sparkles,
    accent: 'from-gold/15 to-amber-500/5 border-gold/25 hover:border-gold/45',
    iconClass: 'text-gold',
  },
  {
    href: '/dashboard/protection',
    title: 'Protection',
    description: 'Leaks, watermarks, and peace of mind',
    icon: Shield,
    accent: 'from-primary/15 to-primary/5 border-primary/20 hover:border-primary/40',
    iconClass: 'text-primary',
  },
  {
    href: '/dashboard/well-being',
    title: 'Well-being',
    description: 'Rhythm, pressure, and balance',
    icon: HeartPulse,
    accent: 'from-venus/15 to-venus/5 border-venus/25 hover:border-venus/45',
    iconClass: 'text-venus',
  },
] as const

export function DashboardCommandTiles() {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className={cn(
              'group relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 transition-colors',
              tile.accent
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'rounded-lg border border-border/40 bg-background/60 p-2.5 shadow-sm backdrop-blur-sm transition-transform group-hover:scale-[1.02]',
                  tile.iconClass
                )}
              >
                <tile.icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="font-semibold tracking-tight">{tile.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{tile.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="flex justify-end">
        <Link
          href="/dashboard/divine-manager"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
          Divine Manager
        </Link>
      </div>
    </div>
  )
}
