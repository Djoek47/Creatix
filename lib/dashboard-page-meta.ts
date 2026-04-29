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
  /** `ai-tools` = gold/purple glow; `minimal` = calm typography; `system` = sans, spacious (e.g. Settings) */
  heroVariant?: 'default' | 'ai-tools' | 'minimal' | 'system'
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
      title: 'Suggestions',
      subtitle: 'Curated tips and plays—reviewed before they land here.',
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
      subtitle: 'Browse, learn what each tool does, then open the one you need. Credits apply where noted.',
      heroVariant: 'minimal',
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
      eyebrow: 'Content',
      title: 'Content',
      subtitle: 'Plan the week, hold the vault, and scan every post — three calm lenses, one workspace.',
      heroVariant: 'minimal',
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
      subtitle: 'Light, load, and boundaries—stay consistent without burning out.',
      heroVariant: 'minimal',
    },
  },
  {
    prefix: '/dashboard/social',
    meta: {
      eyebrow: 'Growth',
      title: 'Social hub',
      subtitle:
        'Draft posts for off-platform reach, manage link-in-bio, and run reputation scans — one quiet workspace.',
      heroVariant: 'minimal',
    },
  },
  {
    prefix: '/dashboard/analytics',
    meta: {
      eyebrow: 'Insight',
      title: 'Analytics',
      subtitle:
        'Synced snapshots and live partner metrics when connected — revenue, audience, and message activity in one view.',
      heroVariant: 'minimal',
    },
  },
  {
    prefix: '/dashboard/protection/aegis',
    meta: {
      eyebrow: 'Aegis',
      title: 'Automation',
      subtitle:
        'Circe runs leak scans on your schedule. Venus keeps reputation on Mentions — Aegis never posts for you; drafts only.',
    },
  },
  {
    prefix: '/dashboard/protection',
    meta: {
      eyebrow: 'Aegis',
      title: 'Circe’s protection',
      subtitle: 'Circe for leaks & takedowns. Venus for reputation. One shield — you approve every move.',
    },
  },
  {
    prefix: '/dashboard/mentions',
    meta: {
      eyebrow: 'Mentions',
      title: 'Venus’ watch',
      subtitle: 'Indexed web mentions, sentiment, and a calm review queue.',
      heroVariant: 'minimal',
    },
  },
  {
    prefix: '/dashboard/settings',
    meta: {
      eyebrow: 'Account',
      title: 'Settings',
      subtitle: 'Your profile, plan, connections, and privacy — in one quiet place.',
      heroVariant: 'system',
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
