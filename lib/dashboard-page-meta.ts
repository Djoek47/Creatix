/**
 * Single source for dashboard page identity: routing + hero variant.
 * Copy lives in messages/{locale}/dashboard.json under dashboard.heroes, keyed by heroKey.
 */

export type DashboardHeroVariant = 'default' | 'ai-tools' | 'minimal' | 'system'

export type DashboardPageMeta = {
  /** Key under `dashboard.heroes` in messages */
  heroKey: string
  heroVariant?: DashboardHeroVariant
}

type Entry = { prefix: string } & DashboardPageMeta

const ENTRIES: Entry[] = [
  {
    prefix: '/dashboard/messages/mass',
    heroKey: 'messages_mass',
  },
  {
    prefix: '/dashboard/community/circe-daily',
    heroKey: 'community_circe_daily',
  },
  {
    prefix: '/dashboard/community',
    heroKey: 'community',
  },
  {
    prefix: '/dashboard/messages',
    heroKey: 'messages',
  },
  {
    prefix: '/dashboard/ai-studio/chatter',
    heroKey: 'ai_studio_chatter',
  },
  {
    prefix: '/dashboard/ai-studio/tools',
    heroKey: 'ai_studio_tools',
    heroVariant: 'minimal',
  },
  {
    prefix: '/dashboard/ai-studio',
    heroKey: 'ai_studio',
    heroVariant: 'ai-tools',
  },
  {
    prefix: '/dashboard/content/new',
    heroKey: 'content_new',
  },
  {
    prefix: '/dashboard/content',
    heroKey: 'content',
    heroVariant: 'minimal',
  },
  {
    prefix: '/dashboard/fans',
    heroKey: 'fans',
    heroVariant: 'minimal',
  },
  {
    prefix: '/dashboard/well-being',
    heroKey: 'well_being',
    heroVariant: 'minimal',
  },
  {
    prefix: '/dashboard/social',
    heroKey: 'social',
    heroVariant: 'minimal',
  },
  {
    prefix: '/dashboard/analytics',
    heroKey: 'analytics',
    heroVariant: 'minimal',
  },
  {
    prefix: '/dashboard/protection/aegis',
    heroKey: 'protection_aegis',
  },
  {
    prefix: '/dashboard/protection',
    heroKey: 'protection',
  },
  {
    prefix: '/dashboard/mentions',
    heroKey: 'mentions',
    heroVariant: 'minimal',
  },
  {
    prefix: '/dashboard/settings',
    heroKey: 'settings',
    heroVariant: 'minimal',
  },
  {
    prefix: '/dashboard/divine-manager',
    heroKey: 'divine_manager',
  },
  {
    prefix: '/dashboard/guide',
    heroKey: 'guide',
  },
]

const SORTED = [...ENTRIES].sort((a, b) => b.prefix.length - a.prefix.length)

export function shouldShowDashboardRouteHero(pathname: string | null): boolean {
  if (!pathname || !pathname.startsWith('/dashboard')) return false
  if (pathname === '/dashboard') return false
  if (pathname === '/dashboard/divine-manager' || pathname.startsWith('/dashboard/divine-manager/')) {
    return false
  }
  if (pathname === '/dashboard/messages' || pathname.startsWith('/dashboard/messages/')) {
    return false
  }
  if (pathname === '/dashboard/guide' || pathname.startsWith('/dashboard/guide/')) return false
  return true
}

export function resolveDashboardPageMeta(pathname: string | null): DashboardPageMeta | null {
  if (!pathname || !pathname.startsWith('/dashboard')) return null
  for (const { prefix, heroKey, heroVariant } of SORTED) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return { heroKey, ...(heroVariant != null ? { heroVariant } : {}) }
    }
  }
  return { heroKey: 'workspace_default' }
}

/** Relative to next-intl namespace `dashboard` (e.g. `heroes.settings.title`). */
export function dashboardHeroTitleKeyFromPath(pathname: string | null): string {
  const meta = resolveDashboardPageMeta(pathname)
  if (!meta?.heroKey) return 'pageTitle'
  return `heroes.${meta.heroKey}.title`
}
