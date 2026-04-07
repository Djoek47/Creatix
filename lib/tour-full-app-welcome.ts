import type { TourConfig } from '@/lib/tour-types'

/**
 * Full-app orientation for `/dashboard/welcome` — one long dialog for brand-new users.
 * Keep in sync with sidebar + major features; bump tourId in tour-config if content changes materially.
 */
export const fullAppWelcomeTour: TourConfig = {
  tourId: 'full-app-v1',
  steps: [
    {
      id: 'full-01',
      title: 'Welcome to Circe et Venus',
      description:
        'This tour walks the whole product in order: sidebar areas, how Circe and Venus split work, AI credits, platforms, and where to dig deeper. Use Next to move through—about 30 short steps.',
    },
    {
      id: 'full-02',
      title: 'Your CRM mental model',
      description:
        'Think of the app as a creator CRM: fans, revenue, inbox, retention, compliance, and AI helpers. The left sidebar is your map; each section below expands on it.',
    },
    {
      id: 'full-03',
      title: 'Dashboard home',
      description:
        'Open Dashboard anytime for stats, connected platforms, and shortcuts. After this tour, use Start Tour on each page for a shorter refresher focused on that screen.',
    },
    {
      id: 'full-04',
      title: 'Divine Manager',
      description:
        'The crown in the sidebar: voice and text control of your AI assistant—tasks, Mimic style, notifications, and running tools without leaving the page.',
    },
    {
      id: 'full-05',
      title: 'Content',
      description:
        'Schedule and plan posts and drops. Tie this to Content library for assets and to AI Studio when you need captions or touch-ups.',
    },
    {
      id: 'full-06',
      title: 'Well-being',
      description:
        'A calmer lane: Mimic snapshot, cosmic calendar, habits—paired with work, not a replacement for professional support.',
    },
    {
      id: 'full-07',
      title: 'Messages',
      description:
        'Unified OnlyFans and Fansly DMs. Refresh threads when you need latest context; some media may open fully only in the official platform app.',
    },
    {
      id: 'full-08',
      title: 'Mass DM',
      description:
        'From Messages or AI Studio: compose broadcasts to segments—separate from 1:1 chat; check compliance for your platforms.',
    },
    {
      id: 'full-09',
      title: 'Social',
      description:
        'Cross-platform promotion and reputation signals outside the adult platforms—use with Mentions for a full picture.',
    },
    {
      id: 'full-10',
      title: 'Content library',
      description:
        'Media vault: describe assets for AI, link posts, safe photo touch-ups—distinct from the Content calendar.',
    },
    {
      id: 'full-11',
      title: 'AI Studio overview',
      description:
        'Media and Vault plus the tools library: captions, churn, competitor insights, gifts, Cupid onboarding for newest fans, and more. Pro tools show credit costs.',
    },
    {
      id: 'full-12',
      title: 'AI credits and Pro',
      description:
        'Many runs consume AI credits (see subscription and tool cards). Upgrade or manage limits under Settings and billing when you need more headroom.',
    },
    {
      id: 'full-13',
      title: 'AI Studio: Chatter and gifts',
      description:
        'AI Chatter handles DM automation lanes where enabled. Gift wishlist ties tools to real product links you save—useful for gift suggester flows.',
    },
    {
      id: 'full-14',
      title: 'Circe vs Venus',
      description:
        'Circe (purple): retention, analytics, protection—keep fans and revenue safe. Venus (gold): growth—fans, public commenter, mentions. Both can power AI personas in tools.',
    },
    {
      id: 'full-15',
      title: 'Analytics',
      description:
        'Revenue and fan trends, snapshots, and paths into deeper tools like Income Predictor for forecasts and goals.',
    },
    {
      id: 'full-16',
      title: 'Income Predictor',
      description:
        'Under Analytics: blends partner stats with your cadence, goals, and context—use for next-month planning, not as a guarantee.',
    },
    {
      id: 'full-17',
      title: 'Retention and churn hub',
      description:
        'Scheduled churn digests, at-risk fans from CRM rules, protocols and tasks—aligns with background jobs and notifications when enabled.',
    },
    {
      id: 'full-18',
      title: 'Churn Predictor tool',
      description:
        'In AI Studio: per-fan churn reads with CRM and thread context—different from the batch Retention digest; use both for strategy.',
    },
    {
      id: 'full-19',
      title: 'Protection',
      description:
        'Leak alerts, scans, DMCA support—review open items regularly; connect platforms so signals stay fresh.',
    },
    {
      id: 'full-20',
      title: 'Aegis',
      description:
        'Protection sub-area for the Aegis hub when configured—central place for advanced protection workflows alongside leaks.',
    },
    {
      id: 'full-21',
      title: 'Fans CRM',
      description:
        'Search, tags, notes, arrangements—your system of record for subscribers across platforms; sync from integrations.',
    },
    {
      id: 'full-22',
      title: 'Fan classification',
      description:
        'Rules to label fans by behavior or spend; results feed lists and automations—keep aligned with Housekeeping segments.',
    },
    {
      id: 'full-23',
      title: 'Housekeeping',
      description:
        'Post and story comments from OnlyFans: persona drafts (Circe, Venus, Flirt, Pro), safety flags, review-before-post. Smart classify: spend, thread activity, freeloader buckets—sync to OnlyFans lists and Fansly tags from Fans → Arrangements or this page.',
    },
    {
      id: 'full-25',
      title: 'Mentions',
      description:
        'Reputation and mention-style signals—pair with Social for how you are discussed off-platform.',
    },
    {
      id: 'full-26',
      title: 'Community',
      description:
        'Peer tips and ideas—not official support; use Guide for product documentation.',
    },
    {
      id: 'full-27',
      title: 'Circe daily tips',
      description:
        'Habits and anchors under Community or linked from Well-being—optional structure for routines.',
    },
    {
      id: 'full-28',
      title: 'Guide',
      description:
        'Long-form help and deep links—bookmark it. When UI labels change, the Guide and this tour are updated together.',
    },
    {
      id: 'full-29',
      title: 'Settings',
      description:
        'Integrations (OnlyFans, Fansly, billing), preferences, security, housekeeping list rules at a glance—connect accounts early for accurate CRM.',
    },
    {
      id: 'full-30',
      title: 'Integrations matter',
      description:
        'Without connected platforms, live lists and webhooks are limited—reconnect if sessions expire; billing gates may apply for adult platform data.',
    },
    {
      id: 'full-31',
      title: 'Header: Start Tour',
      description:
        'On any page, Start Tour opens a short dialog for that page. This full tour is only on Welcome—you can return here from Settings or Guide.',
    },
    {
      id: 'full-32',
      title: 'You are oriented',
      description:
        'Explore the sidebar in any order. When you open a new area, tap Start Tour there for specifics. Open Guide anytime for detail.',
    },
  ],
}
