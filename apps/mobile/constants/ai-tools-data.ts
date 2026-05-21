/**
 * Kept in sync with `lib/ai-tools-data.ts` — single source for AI Studio grid + tool runner.
 */

export type AIToolCategory = 'content' | 'engagement' | 'analytics' | 'protection' | 'premium'

export interface AIToolMeta {
  id: string
  name: string
  description: string
  longDescription: string
  category: AIToolCategory
  badge?: string
  isPro?: boolean
  credits?: number
  hasRunner?: boolean
  hiddenFromLibrary?: boolean
  comingSoon?: boolean
}

export const ALL_TOOLS_META: AIToolMeta[] = [
  {
    id: 'caption-generator',
    name: 'Caption Generator',
    description: 'Captions, posts & short video beats',
    longDescription:
      'Upload a photo or short video (we analyze a key frame), or describe content with text or voice. Captions, hashtags, PPV copy, and optional hook/beats/CTA outline for vertical video—same tool as on web.',
    category: 'content',
    badge: 'Popular',
    credits: 1,
    hasRunner: true,
    hiddenFromLibrary: true,
  },
  { id: 'fantasy-writer', name: 'Fantasy Writer', description: 'Roleplay tied to calendar & fans', longDescription: 'Generate DMs-ready fantasy from your cosmic calendar events, a scheduled content item, and/or a specific fan profile — plus optional scenario text or voice.', category: 'content', credits: 2, hasRunner: true },
  {
    id: 'content-ideas',
    name: 'Content and Caption',
    description: 'Trending ideas & AI captions',
    longDescription:
      'Two modes: trending content ideas for your niche, or the caption generator (upload or describe) for captions, hashtags, and PPV copy.',
    category: 'content',
    credits: 1,
    hasRunner: true,
  },
  { id: 'photo-enhancer', name: 'Safe photo touch-up', description: 'AI blur, lighting, emoji — text or voice', longDescription: 'Upload a photo and describe edits in text or voice; AI maps your request to safe blur, brightness, or emoji overlay (no beautify, inpaint, or video). Also available in Media & Vault with manual sliders.', category: 'content', credits: 1, hasRunner: true },
  {
    id: 'ai-chatter',
    name: 'AI Chatter',
    description: 'Per-fan DM automation (OnlyFans)',
    longDescription:
      'Configure per-fan automations in the web dashboard (AI Studio → AI Chatter): Mimic-aware drafts, queue/review by default, optional opt-in auto-send with beta acknowledgment.',
    category: 'engagement',
    badge: 'Beta',
    credits: 1,
    hasRunner: true,
  },
  {
    id: 'commenter',
    name: 'Commenter',
    description: 'Post comments: CRM signals, personas, safety',
    longDescription:
      'Web-only: open the dashboard in a browser — /dashboard/commenter — for comment sync, persona drafts, safety flags, and Fan Atlas (smart lists).',
    category: 'engagement',
    credits: 0,
    hasRunner: true,
  },
  {
    id: 'housekeeping',
    name: 'Fan Atlas',
    description: 'Map fans into segments: spend, threads & intent',
    longDescription:
      'Web-only: Smart classify — spend, DM/thread activity, cold fans, and freeloader segments — synced to OnlyFans lists & Fansly tags. Open /dashboard/commenter?section=housekeeping or Fans → Arrangements (housekeeping_lists).',
    category: 'engagement',
    badge: 'Beta',
    credits: 0,
    hasRunner: true,
  },
  {
    id: 'gift-suggester',
    name: 'Gift Suggester',
    description: 'Personalized gift recommendations',
    longDescription:
      'Suggest gifts using fan context, budget, and your saved wishlist. On web, add product links on the Gift wishlist (Well-being) so we store title, price, and details for Chatter and this runner.',
    category: 'engagement',
    credits: 1,
    hasRunner: true,
  },
  {
    id: 'whale-whisperer',
    name: 'Whale Whisperer',
    description: 'VIP draft-only chatter',
    longDescription:
      'On web: AI Chatter in Whale whisper mode—drafts only, you send from Messages. Configure from Fans (whales) or AI Studio → Chatter.',
    category: 'engagement',
    credits: 2,
    hasRunner: true,
  },
  {
    id: 'price-optimizer',
    name: 'Price Optimizer',
    description: 'Optimal pricing suggestions',
    longDescription:
      'Hidden from this list — use Divine Manager on web (`run_ai_studio_tool` / price-optimizer).',
    category: 'analytics',
    credits: 2,
    hasRunner: true,
    hiddenFromLibrary: true,
  },
  {
    id: 'dm-bundle-pricing',
    name: 'DM Bundle Pricing',
    description: 'PPV / paid DM bundle price and copy',
    longDescription:
      'Hidden from this list — use Divine Manager on web (`recommend_dm_bundle` / `run_ai_studio_tool` with `dm-bundle-pricing`).',
    category: 'engagement',
    credits: 1,
    hasRunner: true,
    hiddenFromLibrary: true,
  },
  {
    id: 'viral-predictor',
    name: 'Viral Predictor',
    description: 'Content success prediction',
    longDescription: 'Hidden from this list — use Divine Manager on web (`predict_viral`).',
    category: 'analytics',
    badge: 'Beta',
    credits: 2,
    hasRunner: true,
    hiddenFromLibrary: true,
  },
  {
    id: 'churn-predictor',
    name: 'Churn Predictor',
    description: "Who's at risk — Circe's Oracle for retention",
    longDescription:
      'Circe\'s Oracle merged into Churn Predictor: at-risk fans, reasons, and retention plays. Web: Retention hub + AI Studio single-fan runs with CRM/thread context.',
    category: 'analytics',
    credits: 2,
    hasRunner: true,
  },
  {
    id: 'retention-tease',
    name: 'Subscriber retention tease',
    description: 'On-brand teasers for fans who are starting to slip—timed to your calendar.',
    longDescription:
      'On web: Retention hub → short calendar notes, then one batch for feed / story / DM teaser lines. Same credit class as a churn background pass.',
    category: 'analytics',
    credits: 2,
    hasRunner: true,
  },
  {
    id: 'leak-scanner',
    name: 'Leak Scanner',
    description: 'Scheduled leak detection (Aegis)',
    longDescription:
      'On web: Protection → Circe’s Aegis schedules background scans (same engine as manual Protection). Review candidates on desktop.',
    category: 'protection',
    credits: 3,
    hasRunner: true,
  },
  {
    id: 'dmca-automator',
    name: 'DMCA Automator',
    description: 'Auto-draft notices (you send)',
    longDescription:
      'On web: Aegis can auto-create draft DMCA claims for severe leaks — you always review and send; nothing auto-files with third parties.',
    category: 'protection',
    credits: 2,
    hasRunner: true,
  },
  {
    id: 'voice-cloning',
    name: 'Voice Cloning',
    description: 'Coming soon — match your phrasing for DMs and scripts',
    longDescription:
      'Not available yet. Planned: samples + style alignment with Mimic Test. Watch AI Studio on web for launch.',
    category: 'premium',
    badge: 'Coming soon',
    credits: 5,
    hasRunner: false,
    comingSoon: true,
  },
  {
    id: 'competitor-analysis',
    name: 'Competitor Analysis',
    description: 'You vs peers in your band & one tier up',
    longDescription:
      'Pro (web): compares you to named competitors in your **same cohort band** and **one tier above**, using CRM benchmarks + optional web/library. Mobile: POST /api/ai/competitor-analysis with niche, platform, competitorTargets, goals.',
    category: 'premium',
    isPro: true,
    credits: 5,
    hasRunner: true,
  },
  {
    id: 'circe-protection-shield',
    name: "Circe's Aegis",
    description: 'Unified protection hub',
    longDescription:
      'On web: Protection → Aegis for scheduled scans, optional draft DMCAs, and links to Mentions (reputation is a separate pipeline).',
    category: 'premium',
    isPro: true,
    credits: 6,
    hasRunner: true,
  },
  {
    id: 'venus-cupid',
    name: "Cupid's Arrow",
    description: 'Newest fans — onboarding & early churn care',
    longDescription:
      'Lists your newest subscribers from CRM + live platform lists, then drafts warm introductions, first-touch care, and follow-ups. Tags saved CRM fans for Churn Predictor follow-through — new subs churn easily until they feel seen.',
    category: 'premium',
    isPro: true,
    credits: 5,
    hasRunner: true,
  },
  { id: 'standard-of-attraction', name: 'Standard of Attraction', description: 'Pro rating of how commercially attractive your content is', longDescription: 'Let Venus and Circe rate how commercially attractive your latest photos and videos are—through their eyes—before you post.', category: 'premium', isPro: true, badge: 'Pro', credits: 3, hasRunner: true },
]

export const TOOL_IDS_WITH_RUNNER = new Set(
  ALL_TOOLS_META.filter((t) => t.hasRunner && !t.comingSoon).map((t) => t.id),
)

export function getToolMeta(id: string): AIToolMeta | undefined {
  return ALL_TOOLS_META.find((t) => t.id === id)
}
