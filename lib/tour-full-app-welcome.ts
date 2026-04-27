import type { TourConfig } from '@/lib/tour-types'

/**
 * Full-app orientation for `/dashboard/welcome` — navigates real routes and spotlights UI targets.
 * Bump `tourId` when content changes materially.
 */
export const fullAppWelcomeTour: TourConfig = {
  tourId: 'full-app-v3',
  steps: [
    {
      id: 'full-01',
      title: 'Welcome to Circe et Venus',
      description:
        'This tour walks the real app: each step loads the right page and highlights where that area lives in the sidebar (or on the page). Use Next to move through—about thirty short steps.',
      path: '/dashboard/welcome',
      targetSelector: '[data-tour="welcome-card"]',
    },
    {
      id: 'full-02',
      title: 'Your CRM mental model',
      description:
        'Think of the app as a creator CRM: fans, revenue, inbox, retention, compliance, and AI helpers. The left sidebar is your map; each section below expands on it.',
      path: '/dashboard/welcome',
    },
    {
      id: 'full-03',
      title: 'Dashboard home',
      description:
        'Open Dashboard anytime for stats, connected platforms, and shortcuts. After this tour, use Start live tour or Launch live tour in the header to run this same full tour again from any page.',
      path: '/dashboard',
      targetSelector: '[data-tour="/dashboard"]',
    },
    {
      id: 'full-04',
      title: 'Divine Manager',
      description:
        'The crown in the sidebar: voice and text control of your AI assistant—tasks, Mimic style, notifications, and running tools without leaving the page.',
      path: '/dashboard/divine-manager',
      targetSelector: '[data-tour="/dashboard/divine-manager"]',
    },
    {
      id: 'full-05',
      title: 'Content',
      description:
        'Schedule and plan posts and drops. Tie this to Content library for assets and to AI Studio when you need captions or touch-ups.',
      path: '/dashboard/content',
      targetSelector: '[data-tour="/dashboard/content"]',
    },
    {
      id: 'full-06',
      title: 'Well-being',
      description:
        'A calmer lane: Mimic snapshot, cosmic calendar, habits—paired with work, not a replacement for professional support.',
      path: '/dashboard/well-being',
      targetSelector: '[data-tour="/dashboard/well-being"]',
    },
    {
      id: 'full-07',
      title: 'Messages',
      description:
        'Unified OnlyFans and Fansly DMs. Refresh threads when you need latest context; some media may open fully only in the official platform app.',
      path: '/dashboard/messages',
      targetSelector: '[data-tour="/dashboard/messages"]',
    },
    {
      id: 'full-08',
      title: 'Mass DM',
      description:
        'From Messages or AI Studio: compose broadcasts to segments—separate from 1:1 chat; check compliance for your platforms.',
      path: '/dashboard/messages/mass',
    },
    {
      id: 'full-09',
      title: 'Social',
      description:
        'Cross-platform promotion and reputation signals outside the adult platforms—use with Mentions for a full picture.',
      path: '/dashboard/social',
      targetSelector: '[data-tour="/dashboard/social"]',
    },
    {
      id: 'full-10',
      title: 'Content library',
      description:
        'Media vault: describe assets for AI, link posts, safe photo touch-ups—distinct from the Content calendar.',
      path: '/dashboard/content-library',
      targetSelector: '[data-tour="/dashboard/content-library"]',
    },
    {
      id: 'full-11',
      title: 'AI Studio overview',
      description:
        'Media and Vault plus the tools library: captions, churn, competitor insights, gifts, Cupid onboarding for newest fans, and more. Pro tools show credit costs.',
      path: '/dashboard/ai-studio',
      targetSelector: '[data-tour="/dashboard/ai-studio"]',
    },
    {
      id: 'full-12',
      title: 'AI credits and Pro',
      description:
        'Many runs consume AI credits (see subscription and tool cards). Upgrade or manage limits under Settings and billing when you need more headroom.',
      path: '/dashboard/ai-studio?tab=tools',
      targetSelector: '[data-tour="ai-studio-tools-tab"]',
    },
    {
      id: 'full-13',
      title: 'AI Studio: Chatter and gifts',
      description:
        'AI Chatter handles DM automation lanes where enabled. Gift wishlist ties tools to real product links you save—useful for gift suggester flows.',
      path: '/dashboard/ai-studio/chatter',
    },
    {
      id: 'full-14',
      title: 'Circe vs Venus',
      description:
        'Circe (purple): retention, analytics, protection—keep fans and revenue safe. Venus (gold): growth—fans, public commenter, mentions. Both can power AI personas in tools.',
      path: '/dashboard',
    },
    {
      id: 'full-15',
      title: 'Analytics',
      description:
        'Revenue and fan trends, snapshots, and paths into deeper tools like Income Predictor for forecasts and goals.',
      path: '/dashboard/analytics',
      targetSelector: '[data-tour="/dashboard/analytics"]',
    },
    {
      id: 'full-16',
      title: 'Income Predictor',
      description:
        'Under Analytics: blends partner stats with your cadence, goals, and context—use for next-month planning, not as a guarantee.',
      path: '/dashboard/analytics/income-predictor',
      targetSelector: '[data-tour="income-predictor-hero"]',
    },
    {
      id: 'full-17',
      title: 'Retention and churn hub',
      description:
        'Scheduled churn digests, at-risk fans from CRM rules, protocols and tasks—aligns with background jobs and notifications when enabled.',
      path: '/dashboard/retention/churn',
      targetSelector: '[data-tour="/dashboard/retention/churn"]',
    },
    {
      id: 'full-18',
      title: 'Churn Predictor tool',
      description:
        'In AI Studio: per-fan churn reads with CRM and thread context—different from the batch Retention digest; use both for strategy.',
      path: '/dashboard/ai-studio?tab=tools',
      targetSelector: '[data-tour="ai-studio-tools-tab"]',
    },
    {
      id: 'full-19',
      title: 'Protection',
      description:
        'Leak alerts, scans, DMCA support—review open items regularly; connect platforms so signals stay fresh.',
      path: '/dashboard/protection',
      targetSelector: '[data-tour="/dashboard/protection"]',
    },
    {
      id: 'full-20',
      title: 'Aegis',
      description:
        'Protection sub-area for the Aegis hub when configured—central place for advanced protection workflows alongside leaks.',
      path: '/dashboard/protection/aegis',
    },
    {
      id: 'full-21',
      title: 'Fans CRM',
      description:
        'Search, tags, notes, arrangements—your system of record for subscribers across platforms; sync from integrations.',
      path: '/dashboard/fans',
      targetSelector: '[data-tour="/dashboard/fans"]',
    },
    {
      id: 'full-22',
      title: 'Fan classification',
      description:
        'Rules to label fans by behavior or spend; results feed lists and automations—keep aligned with Fan Atlas segments.',
      path: '/dashboard/fans',
      targetSelector: '[data-tour="fans-classify"]',
    },
    {
      id: 'full-23',
      title: 'Commenter',
      description:
        'Post and story comments from OnlyFans: persona drafts (Circe, Venus, Flirt, Pro), safety flags, review-before-post. Fan Atlas (smart classify): spend, thread activity, freeloader buckets—sync to OnlyFans lists and Fansly tags from Fans → Arrangements or this page.',
      path: '/dashboard/commenter',
      targetSelector: '[data-tour="/dashboard/commenter"]',
    },
    {
      id: 'full-25',
      title: 'Mentions',
      description:
        'Reputation and mention-style signals—pair with Social for how you are discussed off-platform.',
      path: '/dashboard/mentions',
      targetSelector: '[data-tour="/dashboard/mentions"]',
    },
    {
      id: 'full-26',
      title: 'Community',
      description:
        'Peer tips and ideas—not official support; use Guide for product documentation.',
      path: '/dashboard/community',
      targetSelector: '[data-tour="/dashboard/community"]',
    },
    {
      id: 'full-27',
      title: 'Circe daily tips',
      description:
        'Habits and anchors under Community or linked from Well-being—optional structure for routines.',
      path: '/dashboard/community/circe-daily',
    },
    {
      id: 'full-28',
      title: 'Guide',
      description:
        'Long-form help and deep links—bookmark it. When UI labels change, the Guide and this tour are updated together.',
      path: '/dashboard/guide',
      targetSelector: '[data-tour="/dashboard/guide"]',
    },
    {
      id: 'full-29',
      title: 'Settings',
      description:
        'Integrations (OnlyFans, Fansly, billing), preferences, security, Fan Atlas list rules at a glance—connect accounts early for accurate CRM.',
      path: '/dashboard/settings',
      targetSelector: '[data-tour="/dashboard/settings"]',
    },
    {
      id: 'full-30',
      title: 'Integrations matter',
      description:
        'Without connected platforms, live lists and webhooks are limited—reconnect if sessions expire; billing gates may apply for adult platform data.',
      path: '/dashboard/settings?tab=integrations',
      targetSelector: '[data-tour="settings-integrations"]',
    },
    {
      id: 'full-31',
      title: 'Header: live tour',
      description:
        'On any page, Start live tour or Launch live tour in the header opens this full tour again (via Welcome). On small screens, use the menu if the header control is hidden.',
      path: '/dashboard',
      targetSelector: '[data-tour="header-start-tour"]',
      targetSelectorFallback: '[data-tour="header-start-tour-mobile"]',
    },
    {
      id: 'full-32',
      title: 'You are oriented',
      description:
        'Explore the sidebar in any order. Replay this tour anytime from the header or Guide. Open Guide for depth and troubleshooting.',
      path: '/dashboard/welcome',
      targetSelector: '[data-tour="welcome-card"]',
    },
  ],
}
