/**
 * Per-page and per-tool tutorial steps. Each step is shown in a popup; user can Next / Back / Done.
 * Completion is stored in localStorage per tourId.
 */

export interface TourStep {
  id: string
  title: string
  description: string
}

export interface TourConfig {
  tourId: string
  steps: TourStep[]
}

const TOURS: Record<string, TourConfig> = {
  '/dashboard': {
    tourId: 'dashboard',
    steps: [
      { id: 'overview', title: 'Dashboard overview', description: 'Your command center: revenue, fans, and messages at a glance. Stats cards show totals; connect OnlyFans or Fansly to see real data.' },
      { id: 'platforms', title: 'Connected platforms', description: 'This widget shows which platforms are linked. Click "Manage" to connect or disconnect accounts in Settings.' },
      { id: 'revenue', title: 'Revenue chart', description: 'Revenue over time from your connected platforms. Sync your accounts to populate this chart.' },
      { id: 'quick-actions', title: 'Quick actions', description: 'Shortcuts to messages, content, fans, and AI tools. Use them to jump into the most common tasks.' },
    ],
  },
  '/dashboard/messages': {
    tourId: 'messages',
    steps: [
      { id: 'list', title: 'Conversations', description: 'All your OnlyFans and Fansly chats in one place. Select a conversation to open it.' },
      { id: 'chat', title: 'Chat window', description: 'Read and reply to fans here. You can send text, use AI suggestions, or schedule replies.' },
      { id: 'mass', title: 'Mass message', description: 'Use "Mass message" to send one message to multiple fans at once (e.g. a promo or announcement).' },
    ],
  },
  '/dashboard/fans': {
    tourId: 'fans',
    steps: [
      { id: 'list', title: 'Fans list', description: 'All subscribers and followers from your connected platforms. Filter by tier (whale, VIP, regular) or search by name.' },
      { id: 'tiers', title: 'Tiers', description: 'Fans are grouped by spending: whales (high spenders), VIPs, and regular. Focus engagement on your top supporters.' },
      { id: 'add', title: 'Add fan', description: 'You can manually add a fan (e.g. from another platform) via "Add fan" for notes and tracking.' },
    ],
  },
  '/dashboard/content': {
    tourId: 'content',
    steps: [
      { id: 'library', title: 'Content library', description: 'All your posts and scheduled content. Filter by status: draft, scheduled, published, archived.' },
      { id: 'new', title: 'New content', description: 'Create a new post from "New content". Write copy, add media, and publish to connected platforms or schedule for later.' },
    ],
  },
  '/dashboard/analytics': {
    tourId: 'analytics',
    steps: [
      { id: 'overview', title: 'Analytics', description: 'Revenue, fans, and engagement over time. Data comes from your connected platforms after sync.' },
      { id: 'breakdown', title: 'Breakdown', description: 'See performance by platform (OnlyFans, Fansly) and by content type to optimize your strategy.' },
    ],
  },
  '/dashboard/well-being': {
    tourId: 'well-being',
    steps: [
      {
        id: 'overview',
        title: 'Well-being hub',
        description:
          'One screen for how heavy your inboxes feel, how your Mimic interview is shaping up, and a cosmic calendar so you can breathe and plan without juggling five tabs.',
      },
      {
        id: 'mimic-snapshot',
        title: 'Mimic snapshot',
        description:
          'Glance at warmth, humor, and flirt sliders from your Mimic profile. Finish the voice interview in Divine Manager when you want fan-facing drafts to sound unmistakably you.',
      },
      {
        id: 'cosmic-hero',
        title: 'Cosmic calendar',
        description:
          'The calendar opens with affirmations, a large moon phase, Western zodiac season, and the Chinese zodiac year. Scroll the strips of all twelve signs, then open the month grid for day-by-day glow.',
      },
      {
        id: 'rhythm',
        title: 'Rhythm, not rigor',
        description:
          'Use this page as a gentle check-in — not a scorecard. Pair it with Daily tips from Circe in Community when you want habit ideas.',
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
          'This is your operations orbit: live voice, text chat, protocol tasks, Mimic, and today’s plan. If you landed on a deep link, the tour still works — scroll the page as we go.',
      },
      {
        id: 'voice',
        title: 'Voice with the crown',
        description:
          'Tap the floating crown to talk. You can open the launcher first (Text Divine, shortcuts) or skip straight into a call from Divine Manager settings. Divine hears you in real time and can open tools, stats, and fans.',
      },
      {
        id: 'text',
        title: 'Text when you prefer typing',
        description:
          'Open the text sheet for the same manager brain. Great for long prompts, links, or when you cannot speak out loud.',
      },
      {
        id: 'protocol-rail',
        title: 'Protocol tasks above the crown',
        description:
          'The collapsible rail lists open follow-ups and workflows. Collapse it anytime you want a clean screen. Briefings work best when tasks link to items in your saved inbox.',
      },
      {
        id: 'bell',
        title: 'Bell and Live vs Divine',
        description:
          'Notifications split platform activity (Live) from leaks, reputation, billing, and Divine actions (Divine). Run a briefing from the bell to queue saved rows for a walkthrough with Divine.',
      },
      {
        id: 'mimic',
        title: 'Mimic Test',
        description:
          'Complete the voice interview so Divine can draft fan-facing lines in your style. Drafts stay review-first — nothing sends until you say so.',
      },
      {
        id: 'today-plan',
        title: 'Today plan and tasks',
        description:
          'See suggested moves for the day, jump to automation and alerts, and wire large-tip tasks if you use those rules. Anchor links on the page jump straight to Today plan or tasks.',
      },
      {
        id: 'voice-settings',
        title: 'How Divine sounds',
        description:
          'In Voice settings: choose brief, balanced, or more expressive replies; decide when the End call button unlocks; set DM focus and composer timing; optional instant crown start.',
      },
      {
        id: 'guide-link',
        title: 'Go deeper in the Guide',
        description:
          'Help and Guide has a full Divine Manager chapter with deep links and plain-language detail. Revisit anytime from the sidebar.',
      },
    ],
  },
  '/dashboard/ai-studio': {
    tourId: 'ai-studio',
    steps: [
      { id: 'vault', title: 'Media & Vault', description: 'Tag and describe content for Divine Manager PPV recommendations, link OnlyFans posts, and run safe photo touch-ups (blur, lighting, emoji).' },
      { id: 'tools', title: 'AI tools', description: 'Open the Tools tab for captions, churn analysis, growth tools, and more—each uses credits where noted.' },
    ],
  },
  '/dashboard/ai-studio/tools': {
    tourId: 'ai-studio-tools',
    steps: [
      { id: 'list', title: 'AI tools', description: 'All available tools: Caption Generator, Flirt Assistant, Content Ideas, Viral Predictor, Revenue Optimizer, and others.' },
      { id: 'open', title: 'Open a tool', description: 'Click a tool to open it. You can run it from the workspace and use the output in your content or messages.' },
    ],
  },
  '/dashboard/settings': {
    tourId: 'settings',
    steps: [
      { id: 'tabs', title: 'Settings tabs', description: 'Profile, Integrations, Security, Billing, and more. Use Integrations to connect or disconnect OnlyFans and Fansly.' },
      { id: 'integrations', title: 'Integrations', description: 'Connect your creator accounts here. OnlyFans uses a secure popup; Fansly uses email/password in a dialog.' },
    ],
  },
  '/dashboard/guide': {
    tourId: 'guide',
    steps: [
      {
        id: 'welcome',
        title: 'Guide',
        description:
          'This page summarizes how Circe et Venus works. Revisit it anytime. Use Start Tour in the header on any dashboard page for a short dialog walkthrough.',
      },
      {
        id: 'divine-chapter',
        title: 'Divine Manager chapter',
        description:
          'Jump to the Divine Manager section in the table of contents for voice, text, protocol tasks, Mimic, notifications, and deep links into the app.',
      },
    ],
  },
  '/dashboard/protection': {
    tourId: 'protection',
    steps: [
      { id: 'leaks', title: 'Leak protection', description: 'Check for unauthorized use of your content. Paste URLs to scan and submit DMCA claims if needed.' },
    ],
  },
  '/dashboard/social': {
    tourId: 'social',
    steps: [
      { id: 'reputation', title: 'Social reputation', description: 'Monitor mentions and reputation across social platforms. Connect accounts to enable scanning.' },
    ],
  },
  '/dashboard/mentions': {
    tourId: 'mentions',
    steps: [
      { id: 'list', title: 'Mentions', description: 'See where you are mentioned online. Review and mark as reviewed from this list.' },
    ],
  },
}

/** Get tour config for a pathname; supports /dashboard/ai-studio/tools/[toolId] by stripping dynamic segment. */
export function getTourForPath(pathname: string, toolId?: string): TourConfig | null {
  const normalized = pathname.replace(/\/$/, '') || '/dashboard'
  if (toolId && normalized.includes('/ai-studio/tools')) {
    const base = '/dashboard/ai-studio/tools'
    return TOURS[base] ?? getTourForPath('/dashboard/ai-studio')
  }
  if (TOURS[normalized]) return TOURS[normalized]
  if (normalized.startsWith('/dashboard/ai-studio/tools/')) return TOURS['/dashboard/ai-studio/tools'] ?? TOURS['/dashboard/ai-studio']
  if (normalized.startsWith('/dashboard/content/new')) return TOURS['/dashboard/content']
  if (normalized.startsWith('/dashboard/fans/new')) return TOURS['/dashboard/fans']
  return TOURS['/dashboard'] ?? null
}

export { TOURS }
