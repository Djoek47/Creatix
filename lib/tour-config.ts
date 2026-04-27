/**
 * Per-page tutorial steps (modal: Next / Back / Done).
 * Completion: localStorage key `${TOUR_STORAGE_PREFIX}${tourId}` (see tour-provider).
 */
import type { TourConfig } from '@/lib/tour-types'
import { fullAppWelcomeTour } from '@/lib/tour-full-app-welcome'

export type { TourStep, TourConfig } from '@/lib/tour-types'

export const TOUR_STORAGE_PREFIX = 'circe-tour-v2-done-'

/** v2 tour content — bump TOUR_STORAGE_PREFIX when changing materially */
const TOURS: Record<string, TourConfig> = {
  '/dashboard': {
    tourId: 'dashboard',
    steps: [
      {
        id: 'map-intro',
        title: 'Your CRM home',
        description:
          'This dashboard is your home base: revenue, fans, inbox health, and quick entry to every area of Circe et Venus—similar to a creator CRM command center.',
      },
      {
        id: 'map-divine',
        title: 'Divine Manager',
        description:
          'Use the sidebar: Divine Manager is voice + text control of your AI assistant—tasks, Mimic style, notifications, and tools without leaving the page.',
      },
      {
        id: 'map-content-wellbeing',
        title: 'Content & Well-being',
        description:
          'Content is your schedule and posts. Well-being is a calmer check-in (Mimic snapshot, cosmic calendar)—pair with work, not replace it.',
      },
      {
        id: 'map-messages-social',
        title: 'Messages & Social',
        description:
          'Messages is your unified OnlyFans/Fansly inbox. Social covers cross-platform promotion and reputation signals outside the adult platforms.',
      },
      {
        id: 'map-content-library',
        title: 'Content library',
        description:
          'Content library is your media vault: describe assets for AI, link posts, and safe touch-ups—separate from the calendar on Content.',
      },
      {
        id: 'map-ai-studio',
        title: 'AI Studio',
        description:
          'AI Studio bundles Media & Vault plus the full tools library (captions, churn, competitor insights, gifts, and more). Pro tools use credits where marked.',
      },
      {
        id: 'map-circe',
        title: 'Circe: retention & shield',
        description:
          'Under Circe: Analytics (revenue and fans), Retention (churn hub and digests), Protection (leaks, DMCA, Aegis). Purple = stay, protect, analyze.',
      },
      {
        id: 'map-venus',
        title: 'Venus: growth',
        description:
          'Under Venus: Fans CRM, Housekeeping (post replies + smart lists), Mentions. Gold = attract, reply in public, reputation.',
      },
      {
        id: 'map-community-guide',
        title: 'Community & Guide',
        description:
          'Community has tips and Circe daily habits. Guide is the long-form manual—bookmark it. Settings holds billing, integrations, and security.',
      },
      {
        id: 'stats',
        title: 'Stats on this page',
        description:
          'Cards summarize revenue, fans, and conversation activity. Connect OnlyFans or Fansly under Settings → Integrations so numbers stay real.',
      },
      {
        id: 'platforms',
        title: 'Connected platforms',
        description:
          'See which accounts are linked. Use Manage or Settings to connect, refresh tokens, or disconnect.',
      },
      {
        id: 'widgets',
        title: 'Widgets & shortcuts',
        description:
          'Alerts, mentions, and quick links push you into Messages, Protection, AI Studio, or Divine—use them as your daily triage list.',
      },
    ],
  },

  '/dashboard/welcome': fullAppWelcomeTour,

  '/dashboard/messages': {
    tourId: 'messages',
    steps: [
      {
        id: 'list',
        title: 'Conversation list',
        description:
          'All OnlyFans and Fansly threads in one list. Pick a fan to load the thread; unread counts and platform badges help you prioritize.',
      },
      {
        id: 'thread',
        title: 'Chat thread',
        description:
          'Read and reply here. Creatix can show media via a secure proxy; if something will not load, open the official OnlyFans or Fansly app for full video or DRM-locked content.',
      },
      {
        id: 'divine-ai',
        title: 'Divine & AI in chat',
        description:
          'Use Divine or suggestion panels where available to draft replies—everything is review-first unless you explicitly enable auto-send in AI Chatter.',
      },
      {
        id: 'refresh',
        title: 'Refresh & actions',
        description:
          'Refresh pulls the latest messages from the platform. Use the thread menu for read/unread and platform-specific actions on OnlyFans.',
      },
      {
        id: 'mass',
        title: 'Mass messaging',
        description:
          'Open Mass message from the Messages area to target segments or lists for promos and announcements—keep compliance and platform rules in mind.',
      },
    ],
  },

  '/dashboard/messages/mass': {
    tourId: 'messages-mass',
    steps: [
      {
        id: 'purpose',
        title: 'Mass DM composer',
        description:
          'Compose one campaign to many fans at once. Segment by tags, lists, or spend where the UI allows—this is your broadcast lane, not 1:1 chat.',
      },
      {
        id: 'review',
        title: 'Review before send',
        description:
          'Preview copy and audience. Platform APIs may throttle or require confirmation; follow OnlyFans/Fansly rules for promotional content.',
      },
    ],
  },

  '/dashboard/fans': {
    tourId: 'fans',
    steps: [
      {
        id: 'list',
        title: 'Fans CRM',
        description:
          'Subscriber and fan rows synced from connected platforms. Search, sort, and open a fan for notes, tags, and deep links to Messages.',
      },
      {
        id: 'tiers',
        title: 'Spend tiers',
        description:
          'Whales, VIPs, and regulars help you prioritize outreach. Align with Housekeeping and Churn for the same fans across the product.',
      },
      {
        id: 'classify',
        title: 'Classification & lists',
        description:
          'Use fan classification or smart lists on the Housekeeping page to keep CRM segments aligned with OnlyFans lists.',
      },
      {
        id: 'add',
        title: 'Manual fans',
        description:
          'Add a fan manually when you need CRM notes or tracking for someone not yet synced—useful for cross-platform context.',
      },
    ],
  },

  '/dashboard/fans/classify': {
    tourId: 'fans-classify',
    steps: [
      {
        id: 'rules',
        title: 'Classification',
        description:
          'Run rules to label fans by behavior or spend. Results feed lists and automations elsewhere—keep rules aligned with your Housekeeping lists.',
      },
      {
        id: 'sync',
        title: 'Sync with platforms',
        description:
          'After classification, sync or push segments to OnlyFans user lists where supported so DMs and promotions match.',
      },
    ],
  },

  '/dashboard/fans/new': {
    tourId: 'fans-new',
    steps: [
      {
        id: 'manual',
        title: 'Add fan',
        description:
          'Add a manual fan row for CRM notes, tags, or tracking when someone is not fully synced from a platform.',
      },
      {
        id: 'crm',
        title: 'Use with CRM',
        description:
          'Return to Fans list to search and merge with synced subscribers; link out to Messages when you start chatting.',
      },
    ],
  },

  '/dashboard/content': {
    tourId: 'content',
    steps: [
      {
        id: 'calendar',
        title: 'Content calendar',
        description:
          'Planned posts and status: draft, scheduled, published. Track what goes out on which day across connected platforms.',
      },
      {
        id: 'new',
        title: 'New post',
        description:
          'Create new content from here: copy, media, schedule. Publish or schedule to connected accounts per integration settings.',
      },
    ],
  },

  '/dashboard/content/new': {
    tourId: 'content-new',
    steps: [
      {
        id: 'composer',
        title: 'Composer',
        description:
          'Write your post, attach media, and pick timing. Match your platform’s rules for PPV, teasers, and locked content.',
      },
      {
        id: 'schedule',
        title: 'Schedule & publish',
        description:
          'Choose publish now or a future slot. Return to Content to edit or move items on the calendar.',
      },
    ],
  },

  '/dashboard/content-library': {
    tourId: 'content-library',
    steps: [
      {
        id: 'vault',
        title: 'Media vault',
        description:
          'Describe and tag media for Divine Manager PPV and recommendations. Link vault items to OnlyFans posts when you need consistent metadata.',
      },
      {
        id: 'photo',
        title: 'Safe photo touch-up',
        description:
          'Request blur, lighting, or emoji overlays—no beautify or inpaint. Same pipeline as AI Studio safe edits.',
      },
      {
        id: 'schedule-link',
        title: 'Content schedule',
        description:
          'Jump to Content schedule from here when you want to place described assets on the calendar.',
      },
    ],
  },

  '/dashboard/analytics': {
    tourId: 'analytics',
    steps: [
      {
        id: 'overview',
        title: 'Analytics',
        description:
          'Revenue, fans, and engagement over time from synced snapshots. Use it to compare periods and platforms after connections are healthy.',
      },
      {
        id: 'breakdown',
        title: 'Platform breakdown',
        description:
          'Split OnlyFans vs Fansly where both are connected. Pair with Retention for churn risk and with Income Predictor for forward-looking goals.',
      },
      {
        id: 'income-predictor-link',
        title: 'Income Predictor',
        description:
          'Open Income Predictor from Analytics for forecast-style goals and cadence—Pro-only where billing applies.',
      },
    ],
  },

  '/dashboard/analytics/income-predictor': {
    tourId: 'analytics-income-predictor',
    steps: [
      {
        id: 'forecast',
        title: 'Income Predictor',
        description:
          'Blends partner statistics with your synced snapshots and goals. Use maintain vs grow modes and calendar notes to sanity-check next month.',
      },
      {
        id: 'goals',
        title: 'Goals & realism',
        description:
          'Set targets and read intermediate bands—this is planning, not a guarantee. Revisit after major campaigns or platform changes.',
      },
    ],
  },

  '/dashboard/well-being': {
    tourId: 'well-being',
    steps: [
      {
        id: 'overview',
        title: 'Well-being hub',
        description:
          'One screen for inbox load, Mimic profile snapshot, Gift wishlist (product context for fans and AI), and a cosmic calendar—so you can breathe and plan without juggling five tabs.',
      },
      {
        id: 'mimic-snapshot',
        title: 'Mimic snapshot',
        description:
          'Warmth, humor, and flirt sliders from your Mimic profile. Finish the voice interview in Divine Manager when you want fan-facing drafts to sound like you.',
      },
      {
        id: 'cosmic-hero',
        title: 'Cosmic calendar',
        description:
          'Moon phase, zodiac, and monthly grid—optional rhythm. Pair with Community → Circe daily tips for habit ideas.',
      },
      {
        id: 'rhythm',
        title: 'Rhythm, not rigor',
        description:
          'Use this as a gentle check-in, not a scorecard. Pair with Community when you want structured habit ideas.',
      },
    ],
  },

  '/dashboard/divine-manager': {
    tourId: 'divine-manager',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to Divine Manager',
        description:
          'Operations orbit: live voice, text chat, protocol tasks, Mimic, and today’s plan. Scroll the page if you landed on a deep link.',
      },
      {
        id: 'voice',
        title: 'Voice with the crown',
        description:
          'Tap the floating crown to talk. Open the launcher for Text Divine and shortcuts, or jump straight into voice from settings.',
      },
      {
        id: 'text',
        title: 'Text chat',
        description:
          'The text sheet runs the same manager brain—best for long prompts, links, or when you cannot speak.',
      },
      {
        id: 'protocol-rail',
        title: 'Protocol tasks',
        description:
          'The collapsible rail lists follow-ups and workflows. Collapse it for a clean screen; link tasks to inbox items when possible.',
      },
      {
        id: 'bell',
        title: 'Notifications',
        description:
          'Live vs Divine: platform activity vs leaks, billing, reputation, and Divine actions. Run a briefing to walk saved rows with Divine.',
      },
      {
        id: 'mimic',
        title: 'Mimic Test',
        description:
          'Voice interview so Divine mirrors your fan-reply style. Drafts are review-first; a future Voice Cloning runner in AI Studio is planned for extra samples.',
      },
      {
        id: 'today-plan',
        title: 'Today plan and tasks',
        description:
          'Suggested moves for the day, automation hooks, and large-tip rules when configured. Anchor links jump to Today plan or tasks.',
      },
      {
        id: 'voice-settings',
        title: 'Voice settings',
        description:
          'Brevity vs expressiveness, when End call unlocks, DM focus, composer timing, and optional instant crown start.',
      },
      {
        id: 'guide-link',
        title: 'Guide',
        description:
          'The Guide has a full Divine Manager chapter with deep links. Revisit anytime from the sidebar.',
      },
    ],
  },

  '/dashboard/ai-studio': {
    tourId: 'ai-studio',
    steps: [
      {
        id: 'tabs',
        title: 'AI Studio',
        description:
          'Two tabs: Media & Vault (assets, descriptions, safe edits) and Tools (full library). Credits apply where each tool says so; Pro gates apply for premium tools.',
      },
      {
        id: 'vault',
        title: 'Media & Vault',
        description:
          'Tag content for Divine, link OnlyFans posts, vault photos for PPV context, and run safe photo touch-ups.',
      },
      {
        id: 'tools',
        title: 'Tools library',
        description:
          'Captions, churn, competitor analysis, gifts, fantasy writer, and more. Some tools are listed as Coming soon until they are ready.',
      },
      {
        id: 'chatter-gifts',
        title: 'Chatter & gifts',
        description:
          'Open AI Chatter and Gift wishlist from here for DM automation and product links in gift suggestions.',
      },
    ],
  },

  '/dashboard/ai-studio/tools': {
    tourId: 'ai-studio-tools',
    steps: [
      {
        id: 'grid',
        title: 'Tools library',
        description:
          'Search and filter by category. Each card opens a runner or redirects to the right dashboard (e.g. Housekeeping, Retention, Protection).',
      },
      {
        id: 'credits',
        title: 'Credits & Pro',
        description:
          'Credits show in the header. Pro-only tools require an active plan; locked cards link to billing.',
      },
      {
        id: 'open',
        title: 'Run a tool',
        description:
          'Click through to run from the workspace. Outputs are yours to copy into messages, posts, or protocols.',
      },
    ],
  },

  '/dashboard/ai-studio/chatter': {
    tourId: 'ai-studio-chatter',
    steps: [
      {
        id: 'purpose',
        title: 'AI Chatter',
        description:
          'Per-fan DM automation for OnlyFans: drafts, queues, optional auto-send (beta). Pair with Mimic for tone and with Messages for the live thread.',
      },
      {
        id: 'profiles',
        title: 'Profiles & whales',
        description:
          'Switch modes or whale whisper profiles where available. Review everything before send unless you have explicitly enabled automation.',
      },
    ],
  },

  '/dashboard/ai-studio/gifts': {
    tourId: 'ai-studio-gifts',
    steps: [
      {
        id: 'wishlist',
        title: 'Gift wishlist',
        description:
          'Save HTTPS product links; we pull titles, prices, and details when possible so Chatter, Divine, and Gift Suggester know what to suggest when a fan sends a gift.',
      },
      {
        id: 'use',
        title: 'Using in tools',
        description:
          'Build your list here, then run Gift Suggester from Divine Manager (or pin it on the home dashboard) when you want AI-ranked picks using this context.',
      },
    ],
  },

  '/dashboard/settings': {
    tourId: 'settings',
    steps: [
      {
        id: 'tabs',
        title: 'Settings',
        description:
          'Profile, Integrations, Security, Billing, and preferences. Integrations connect OnlyFans and Fansly; billing controls Pro and credits.',
      },
      {
        id: 'integrations',
        title: 'Integrations',
        description:
          'Connect OnlyFans via secure OAuth popup; Fansly via email/password in the dialog. Disconnect here if tokens expire.',
      },
      {
        id: 'billing',
        title: 'Billing & plan',
        description:
          'Upgrade, payment method, and usage limits where applicable. Adult-platform billing may gate certain features.',
      },
    ],
  },

  '/dashboard/guide': {
    tourId: 'guide',
    steps: [
      {
        id: 'guide-hub',
        title: 'Guide & orbital tour',
        description:
          'This page combines the full-app tour story with the manual: scroll animated steps (each callout sits above the surface it describes), launch the live tour from Welcome, or expand Deep reference for integrations and troubleshooting.',
      },
      {
        id: 'header-tour',
        title: 'Shorter page tours',
        description:
          'On other screens, Start Tour in the header opens a spotlight walkthrough for that page. Switch routes and tap it again for area-specific tips.',
      },
    ],
  },

  '/dashboard/protection': {
    tourId: 'protection',
    steps: [
      {
        id: 'overview',
        title: 'Protection',
        description:
          'Leak alerts, DMCA drafts, and resolution history. Paste URLs to scan; review every claim before sending to third parties.',
      },
      {
        id: 'aegis',
        title: 'Aegis hub',
        description:
          'Open Circe’s Aegis for scheduled scans, optional draft DMCAs, and links to broader protection settings—see the Protection tour on the Aegis page for detail.',
      },
    ],
  },

  '/dashboard/protection/aegis': {
    tourId: 'protection-aegis',
    steps: [
      {
        id: 'shield',
        title: 'Aegis',
        description:
          'Unified hub: shield toggles, Sentinel schedule, leak-scan defaults, optional Hammer drafts, and links to Mentions for reputation (separate from leak alerts).',
      },
      {
        id: 'schedule',
        title: 'Scans & drafts',
        description:
          'Configure cadence and severity. Review every automated draft before it is sent externally.',
      },
      {
        id: 'dmca',
        title: 'DMCA & leaks',
        description:
          'Leak Scanner and DMCA Automator can draft from severe findings—you still review and send from Protection.',
      },
    ],
  },

  '/dashboard/social': {
    tourId: 'social',
    steps: [
      {
        id: 'reputation',
        title: 'Social promotion',
        description:
          'Cross-platform promotion and reputation signals. Connect accounts where available so scans have context.',
      },
      {
        id: 'mentions',
        title: 'With Mentions',
        description:
          'Use Venus → Mentions for review queues; Social complements with broader promotion context.',
      },
    ],
  },

  '/dashboard/mentions': {
    tourId: 'mentions',
    steps: [
      {
        id: 'queue',
        title: 'Mentions',
        description:
          'Inbound mentions and reputation items to triage. Mark reviewed when handled; escalate to Protection if leaks overlap.',
      },
      {
        id: 'workflow',
        title: 'Workflow',
        description:
          'Pair with Housekeeping for public replies and with Divine for suggested responses where enabled.',
      },
    ],
  },

  '/dashboard/retention/churn': {
    tourId: 'retention-churn',
    steps: [
      {
        id: 'hub',
        title: 'Retention hub',
        description:
          'Churn Predictor: scheduled digests for expiring subs and quiet fans, CRM-backed. Configure cadence, credits, and notifications here.',
      },
      {
        id: 'last-run',
        title: 'Last run & digest',
        description:
          'Last run shows when the background job completed. Sync CRM so expiries and spend are accurate; some media may only fully play in the official platform app.',
      },
      {
        id: 'protocols',
        title: 'Protocols & tasks',
        description:
          'Open protocols and tasks to act on batches. Link to AI Studio churn tool for one-off deep dives on a fan.',
      },
      {
        id: 'tease',
        title: 'Future tease',
        description:
          'Optional calendar notes feed retention teasers in digests—align with Content calendar for consistent messaging.',
      },
    ],
  },

  '/dashboard/commenter': {
    tourId: 'commenter',
    steps: [
      {
        id: 'feed',
        title: 'Housekeeping',
        description:
          'Sync post and story comments from OnlyFans via webhooks and API. Review each fan comment with AI safety and persona reply drafts.',
      },
      {
        id: 'personas',
        title: 'Circe, Venus, Flirt, Pro',
        description:
          'Pick a persona suggestion or Best pick—copy to OnlyFans manually; review-only by default. Stalking or risk flags surface for Divine notifications.',
      },
      {
        id: 'housekeeping',
        title: 'Smart lists',
        description:
          'Smart classify: auto-segment fans by spend, thread/DM activity, cold fans, and freeloaders — then sync those segments to OnlyFans lists and Fansly tags. Configure under Fans → Arrangements or here.',
      },
    ],
  },

  '/dashboard/community': {
    tourId: 'community',
    steps: [
      {
        id: 'tips',
        title: 'Community',
        description:
          'Approved tips and community content. Use it for peer ideas and habit inspiration—not official support.',
      },
      {
        id: 'circe-daily',
        title: 'Circe daily tips',
        description:
          'Open Circe daily tips for numbered habits and anchors; link from Well-being when you want structured routines.',
      },
    ],
  },

  '/dashboard/community/circe-daily': {
    tourId: 'community-circe-daily',
    steps: [
      {
        id: 'daily',
        title: 'Circe daily tips',
        description:
          'Numbered tips with anchors for deep linking. Use alongside Well-being and Community for habits.',
      },
      {
        id: 'prefs',
        title: 'Preferences',
        description:
          'Toggle tip types in Settings → Preferences when available so the feed matches your focus.',
      },
    ],
  },
}

/**
 * Longest-prefix-first: community/circe-daily before community;
 * ai-studio/tools before ai-studio; etc.
 */
const TOUR_PATH_MATCH_ORDER: string[] = [
  '/dashboard/welcome',
  '/dashboard/community/circe-daily',
  '/dashboard/analytics/income-predictor',
  '/dashboard/retention/churn',
  '/dashboard/ai-studio/chatter',
  '/dashboard/ai-studio/gifts',
  '/dashboard/ai-studio/tools',
  '/dashboard/messages/mass',
  '/dashboard/protection/aegis',
  '/dashboard/fans/classify',
  '/dashboard/commenter',
  '/dashboard/content-library',
  '/dashboard/community',
  '/dashboard/content/new',
  '/dashboard/fans/new',
]

function pathMatchesNormalizedKey(normalized: string, key: string): boolean {
  return normalized === key || normalized.startsWith(key + '/')
}

export function getTourForPath(pathname: string, _toolId?: string): TourConfig | null {
  const normalized = pathname.replace(/\/$/, '') || '/dashboard'

  for (const key of TOUR_PATH_MATCH_ORDER) {
    const cfg = TOURS[key]
    if (cfg && pathMatchesNormalizedKey(normalized, key)) return cfg
  }

  const direct = TOURS[normalized]
  if (direct) return direct

  if (normalized.startsWith('/dashboard/ai-studio/tools/')) {
    return TOURS['/dashboard/ai-studio/tools'] ?? TOURS['/dashboard/ai-studio'] ?? null
  }

  return TOURS['/dashboard'] ?? null
}

export { TOURS }
