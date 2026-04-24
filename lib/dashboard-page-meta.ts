/**
 * Single source for dashboard page identity: one hero per route (no duplicate header + body titles).
 * Longest URL prefix wins.
 */

export type DashboardPageMeta = {
  /** Small caps line above the title */
  eyebrow: string
  /** Primary page title (matches visible <h1> in DashboardRouteHero) */
  title: string
  subtitle: string
  /** Gold/purple glow mark + spectrum hover (AI Studio routes) */
  heroVariant?: 'default' | 'ai-tools'
}

type Entry = { prefix: string; meta: DashboardPageMeta }

const ENTRIES: Entry[] = [
  {
    prefix: '/dashboard/messages/mass',
    meta: {
      eyebrow: 'Broadcast',
      title: 'Mass messages',
      subtitle: 'Reach your lists with intention — segments, timing, and tone in one flow.',
    },
  },
  {
    prefix: '/dashboard/community/circe-daily',
    meta: {
      eyebrow: 'Daily ritual',
      title: 'Circe’s counsel',
      subtitle: 'Bite-sized strategy from Circe — one luminous insight per day.',
    },
  },
  {
    prefix: '/dashboard/community',
    meta: {
      eyebrow: 'Collective · Beta',
      title: 'Community wisdom',
      subtitle: 'Tips and plays from creators who move like you do.',
    },
  },
  {
    prefix: '/dashboard/messages',
    meta: {
      eyebrow: 'Correspondence',
      title: 'Sacred inbox',
      subtitle:
        'Where desire gets answered — DMs, insights, and mass reach across OnlyFans & Fansly in one velvet command centre.',
    },
  },
  {
    prefix: '/dashboard/ai-studio/chatter',
    meta: {
      eyebrow: 'Presence',
      title: 'AI Chatter',
      subtitle: 'Train the voice that never sleeps — replies that still sound unmistakably you.',
    },
  },
  {
    prefix: '/dashboard/ai-studio/tools',
    meta: {
      eyebrow: 'Toolkit',
      title: 'AI tools',
      subtitle: 'Search, filter, run — credits apply where marked.',
      heroVariant: 'ai-tools',
    },
  },
  {
    prefix: '/dashboard/ai-studio',
    meta: {
      eyebrow: 'Creation',
      title: 'AI Studio',
      subtitle: 'Media vault and the full tool library.',
      heroVariant: 'ai-tools',
    },
  },
  {
    prefix: '/dashboard/content-library',
    meta: {
      eyebrow: 'Archive',
      title: 'Content library',
      subtitle: 'Every asset you’ve blessed — search, reuse, and ship faster.',
    },
  },
  {
    prefix: '/dashboard/content/new',
    meta: {
      eyebrow: 'Compose',
      title: 'New drop',
      subtitle: 'Shape the next piece your audience will crave.',
    },
  },
  {
    prefix: '/dashboard/content',
    meta: {
      eyebrow: 'Rhythm',
      title: 'Cosmic calendar',
      subtitle: 'Schedule and orchestrate posts across platforms without losing the plot.',
    },
  },
  {
    prefix: '/dashboard/fans/new',
    meta: {
      eyebrow: 'Ledger',
      title: 'Welcome a fan',
      subtitle: 'Add someone beautiful to your inner circle.',
    },
  },
  {
    prefix: '/dashboard/fans',
    meta: {
      eyebrow: 'Devotion',
      title: 'Fan sanctum',
      subtitle: 'Who spends, who stays, who matters — your subscriber universe, distilled.',
    },
  },
  {
    prefix: '/dashboard/well-being',
    meta: {
      eyebrow: 'Equilibrium',
      title: 'Well-being',
      subtitle: 'Pressure, boundaries, and breath — stay magnetic without burning out.',
    },
  },
  {
    prefix: '/dashboard/social',
    meta: {
      eyebrow: 'Growth',
      title: 'Social hub',
      subtitle:
        'Draft posts that pull to OnlyFans and Fansly, curate your link-in-bio stack, and run reputation scans in one calm workspace.',
    },
  },
  {
    prefix: '/dashboard/analytics',
    meta: {
      eyebrow: 'Insight',
      title: 'Analytics',
      subtitle:
        'Circe snapshots from your syncs, plus live OnlyFans partner metrics when you are connected — curves, mix, and the story the numbers whisper.',
    },
  },
  {
    prefix: '/dashboard/protection',
    meta: {
      eyebrow: 'Aegis',
      title: 'Circe’s protection',
      subtitle: 'Leaks found, claims filed, peace guarded — the shield around your empire.',
    },
  },
  {
    prefix: '/dashboard/mentions',
    meta: {
      eyebrow: 'Horizon',
      title: 'Venus’ watch',
      subtitle: 'Who’s talking, what they feel, where your name travels next.',
    },
  },
  {
    prefix: '/dashboard/settings',
    meta: {
      eyebrow: 'Sovereignty',
      title: 'Settings',
      subtitle: 'Account, integrations, and the quiet switches that run your world.',
    },
  },
  {
    prefix: '/dashboard/divine-manager',
    meta: {
      eyebrow: 'Orchestra',
      title: 'Divine Manager',
      subtitle: '',
    },
  },
  {
    prefix: '/dashboard/guide',
    meta: {
      eyebrow: 'Path',
      title: 'Guide',
      subtitle: '',
    },
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
  for (const { prefix, meta } of SORTED) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return meta
    }
  }
  return {
    eyebrow: 'Sanctuary',
    title: 'Workspace',
    subtitle: 'Your creator cockpit — choose a star from the sidebar.',
  }
}

/** Accessible label for top bar (no visible duplicate title). */
export function getDashboardPageAriaLabel(pathname: string | null): string {
  return resolveDashboardPageMeta(pathname)?.title ?? 'Dashboard'
}
