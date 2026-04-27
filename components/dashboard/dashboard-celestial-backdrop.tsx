import { AuthStarfieldDecor } from '@/components/auth/auth-starfield-decor'
import { DashboardLivingConstellation } from '@/components/dashboard/dashboard-living-constellation'
import { cn } from '@/lib/utils'

/**
 * Full-viewport dashboard canvas: theme base wash + dense animated stars/constellations (no login photos).
 * Sits behind sidebar + main; main uses transparent bg so this shows through.
 */
export function DashboardCelestialBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-background" />
      <div
        className={cn(
          'absolute inset-0',
          'bg-[radial-gradient(ellipse_95%_65%_at_12%_-8%,rgba(139,92,246,0.11),transparent_55%),radial-gradient(ellipse_80%_50%_at_98%_108%,rgba(251,191,36,0.08),transparent_50%)]',
          'dark:bg-[radial-gradient(ellipse_92%_62%_at_10%_0%,rgba(109,40,217,0.2),transparent_52%),radial-gradient(ellipse_78%_52%_at_94%_100%,rgba(180,83,9,0.11),transparent_48%)]',
        )}
      />
      <div
        className={cn(
          'absolute inset-0 opacity-70 dark:opacity-80',
          'bg-gradient-to-br from-circe/[0.06] via-transparent to-gold/[0.05]',
          'dark:from-circe/[0.1] dark:to-gold/[0.07]',
        )}
      />
      <div
        className={cn(
          'pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'h-[132%] min-h-[132%] w-[132%] min-w-[132%]',
        )}
      >
        <div className={cn('h-full w-full', 'dashboard-celestial-sky-rotate')}>
          <DashboardLivingConstellation />
          <AuthStarfieldDecor intensity="full" density="rich" />
        </div>
      </div>
      <div
        className="absolute inset-0 opacity-[0.022] dark:opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}
