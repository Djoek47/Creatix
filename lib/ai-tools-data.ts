/**
 * Single source of truth for AI Tools Library.
 * Used by the library grid and the tool runner.
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
  /** If true, this tool has a dedicated form + API in AIToolsSelector / runner */
  hasRunner?: boolean
  /** Omit from AI Studio tools grid (still in Divine Manager `run_ai_studio_tool` ids when hasRunner) */
  hiddenFromLibrary?: boolean
  /** Omit from dashboard “pinned tool” picker — use when the capability lives inside another surface (e.g. Frame editor) */
  hiddenFromFeatured?: boolean
  /** Shown in the library but not runnable yet (no API / runner) */
  comingSoon?: boolean
}

// Icon names only; actual icons are resolved in the component that renders (tools page / library)
export const ALL_TOOLS_META: AIToolMeta[] = [
  {
    id: 'caption-generator',
    name: 'Caption Generator',
    description: 'Captions, posts & short video beats',
    longDescription:
      'Upload a photo or short clip (we look at a key frame), or describe what you are posting in text or voice. You get ready-to-post captions, hashtags, and PPV wording. For video, you can ask for a simple arc in one go: hook, beats, on-screen text, and a closing call-to-action.',
    category: 'content',
    badge: 'Popular',
    credits: 1,
    hasRunner: true,
    /** Fused into Content Ideas (Content Studio) — open Ideas + Captions from one card. */
    hiddenFromLibrary: true,
  },
  { id: 'fantasy-writer', name: 'Fantasy Writer', description: 'Roleplay tied to calendar & fans', longDescription: 'Generate DMs-ready fantasy from your cosmic calendar events, a scheduled content item, and/or a specific fan profile — plus optional scenario text or voice.', category: 'content', badge: 'Popular', credits: 2, hasRunner: true },
  {
    id: 'content-ideas',
    name: 'Content Ideas',
    description: 'Trending ideas & AI captions',
    longDescription:
      'Two modes in one place: get trending content ideas for your niche, or switch to the caption generator—upload media (or describe with text/voice) for platform-ready captions, hashtags, and PPV copy.',
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
      'Set up per-fan DM help on the AI Chatter page: drafts that match how you usually sound, a queue so you review before anything goes out, and an optional beta path to send automatically if you turn it on. Open it from AI Studio under Tools, or from your dashboard’s AI Chatter section.',
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
      'Work from the Commenter page on your dashboard. It pulls comments on your posts, stories, and streams so you can see who said what and how heated or positive it feels. You get several suggested public replies in different tones—playful, warm, flirty, or straight professional—plus one “best” blend to start from. Nothing posts for you: you copy what you like into OnlyFans. Odd or worrying threads can surface as Divine alerts so you do not miss them. If you want replies to lean a bit harder into upsell, you can turn that up in Divine Manager under automation settings for Commenter. Fan list housekeeping tools sit on the same page when you want lists to stay in sync with how people behave.',
    category: 'engagement',
    badge: 'MVP',
    credits: 0,
    hasRunner: true,
  },
  {
    id: 'housekeeping',
    name: 'Housekeeping',
    description: 'Auto-classify fans: spend, threads & freeloaders',
    longDescription:
      'Keeps your audience buckets honest: who spends, who chats often, who has gone quiet, and who looks like a freeloader versus a real prospect. You choose what each bucket means under Fans → Arrangements, then tie buckets to your OnlyFans lists and Fansly tags. The same housekeeping panel lives on the Commenter page. A background job refreshes those lists on a schedule so whales, steady spenders, and “needs attention” groups stay up to date without you micromanaging spreadsheets. Works best alongside Commenter so what fans do in public and in DMs lines up in one place.',
    category: 'engagement',
    badge: 'MVP',
    credits: 0,
    hasRunner: true,
  },
  {
    id: 'gift-suggester',
    name: 'Gift Suggester',
    description: 'Personalized gift recommendations',
    longDescription:
      'Suggest gifts using fan context, budget, and your saved wishlist. Add any number of product links on the Gift wishlist (Well-being, or AI Studio → gifts); we extract title, price, and details when a retailer allows it. Chatter and this runner use that context when a fan wants to send something. Open the runner from Divine Manager.',
    category: 'engagement',
    credits: 1,
    hasRunner: true,
    hiddenFromLibrary: true,
  },
  {
    id: 'whale-whisperer',
    name: 'Whale Whisperer',
    description: 'VIP draft-only chatter',
    longDescription:
      'Opens AI Chatter in a VIP-only mode: same thread and “sounds like me” context as regular chatter, but every line waits in a queue for you to send from Messages—nothing goes out on its own. Add your top fans from the Fans table or from the Chatter dashboard.',
    category: 'engagement',
    credits: 2,
    hasRunner: true,
  },
  {
    id: 'price-optimizer',
    name: 'Price Optimizer',
    description: 'Optimal pricing suggestions',
    longDescription:
      'Suggests angles for subscription price, PPV, and customs from your situation and goals. It does not appear as its own tile in the AI Studio grid—ask Divine Manager in chat or voice to run the price optimizer for you.',
    category: 'analytics',
    credits: 4,
    hasRunner: true,
    hiddenFromLibrary: true,
  },
  {
    id: 'dm-bundle-pricing',
    name: 'DM Bundle Pricing',
    description: 'PPV / paid DM bundle price and copy',
    longDescription:
      'Suggests bundle prices and the short teaser text fans see, using your goal, who you are messaging, and what is in your vault. It is not a separate tile in AI Studio—ask Divine Manager to recommend a DM bundle.',
    category: 'engagement',
    credits: 1,
    hasRunner: true,
    hiddenFromLibrary: true,
  },
  {
    id: 'mass-dm-audience-suggester',
    name: 'Mass DM Audience Suggester',
    description: 'Ranks the best fan cohort for a campaign goal',
    longDescription:
      'Power-user helper for Mass Campaigns. Reviews CRM + thread context and suggests who to target first for retention, conversion, or PPV goals.',
    category: 'engagement',
    credits: 4,
    hasRunner: true,
    hiddenFromLibrary: true,
  },
  {
    id: 'mass-dm-fan-captions',
    name: 'Mass DM Fan Captions',
    description: 'Per-fan campaign copy from CRM + thread context',
    longDescription:
      'Builds per-recipient DM copy for a selected campaign audience, using fan profile and thread signals for personalized variants.',
    category: 'engagement',
    credits: 3,
    hasRunner: true,
    hiddenFromLibrary: true,
  },
  {
    id: 'mass-dm-ppv-pricing',
    name: 'Mass DM PPV Pricing',
    description: 'Per-fan PPV pricing from spend and campaign targets',
    longDescription:
      'Suggests individualized PPV prices from fan spend, profile signals, and a campaign-level revenue target with a minimum floor.',
    category: 'analytics',
    credits: 4,
    hasRunner: true,
    hiddenFromLibrary: true,
  },
  {
    id: 'brand-uniformity',
    name: 'Branding',
    description: 'Creator brand profile for cross-tool consistency',
    longDescription:
      'Beta tool for defining your creator brand identity (voice, colors, logos, watermark defaults) and reusing it across captioning, ideation, and publishing flows.',
    category: 'content',
    badge: 'Beta',
    credits: 1,
    hasRunner: true,
    hiddenFromLibrary: false,
  },
  {
    id: 'credits-planner',
    name: 'Credits Planner',
    description: 'Smart monthly credit strategy',
    longDescription:
      'Scans your fan count and recent revenue to build a premium-first monthly plan, with explicit separation between expiring included credits and non-expiring purchased credits.',
    category: 'analytics',
    badge: 'Beta',
    credits: 0,
    hasRunner: true,
    hiddenFromLibrary: false,
  },
  {
    id: 'viral-predictor',
    name: 'Viral Predictor',
    description: 'Content success prediction',
    longDescription:
      'Gives a quick read on how strong a post might perform before you publish. It is not listed as its own card in AI Studio—ask Divine Manager (chat or voice) to run a viral prediction.',
    category: 'analytics',
    badge: 'Beta',
    credits: 3,
    hasRunner: true,
    hiddenFromLibrary: true,
  },
  {
    id: 'churn-predictor',
    name: 'Churn Predictor',
    description: "Who's at risk — Circe's Oracle for retention",
    badge: 'Circe Pro',
    longDescription:
      'Surfaces who is slipping away and what to try next—expiring subs, gone-quiet regulars, and similar patterns. The Retention area on your dashboard can send batch digests, Divine alerts, and saved reports. From AI Studio you can still run a one-fan deep dive with the same signals you already trust.',
    category: 'analytics',
    credits: 3,
    hasRunner: true,
  },
  {
    id: 'retention-tease',
    name: 'Retention content tease',
    description: 'On-brand teasers for fans who are starting to slip—timed to your calendar.',
    longDescription:
      'Jot what’s next on the Retention hub, run a single batch, and get ready-to-use lines for feed, stories, and DMs. Credits match one churn-predictor background pass.',
    category: 'analytics',
    credits: 3,
    hasRunner: true,
  },
  {
    id: 'income-predictor',
    name: 'Income Predictor',
    description: 'Partner forecast + cadence + next-month goals',
    longDescription:
      'Combines partner-side revenue forecasting with what we already know from your synced numbers, how often you post, weekly and monthly rhythm, leak stress, and whether your goals are realistic—including gentler stepping-stone targets if a jump looks too steep. Open it from Analytics → Income Predictor on the dashboard.',
    category: 'analytics',
    badge: 'Beta',
    credits: 4,
    hasRunner: true,
  },
  {
    id: 'leak-scanner',
    name: 'Leak Scanner',
    description: 'Scheduled leak detection (Aegis)',
    longDescription:
      'Configure background web scans under Protection → Circe’s Aegis: same Serper + Grok pipeline as manual Protection scan, on your chosen cadence. Review every candidate before acting.',
    category: 'protection',
    credits: 42,
    hasRunner: true,
  },
  {
    id: 'dmca-automator',
    name: 'DMCA Automator',
    description: 'Auto-draft notices (you send)',
    longDescription:
      'From Aegis: optionally auto-create draft DMCA claims for high-severity leaks. Nothing is filed with hosts automatically — open Protection to review, edit, and send each notice yourself.',
    category: 'protection',
    credits: 7,
    hasRunner: true,
  },
  {
    id: 'voice-cloning',
    name: 'Voice Cloning',
    description: 'Coming soon — match your phrasing for DMs and scripts',
    longDescription:
      '**Not available yet.** We plan a dedicated runner to learn your phrasing and rhythm from samples (text or dictation), aligned with Divine Manager → Mimic Test for fan-reply style. Check back for a future Pro release.',
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
      'For Pro: compares you to other creators in a similar-size band, then to the next band up, using anonymized cohort stats from Creatix—not anyone’s private revenue. You can add public @handles or short positioning notes so the run has real names to contrast. Optional web discovery and our shared tips library fill in context. We do not break into paywalled sites or steal private metrics. Not listed in AI Studio → Tools—ask Divine Manager to run competitor-analysis (or pin it on the home dashboard).',
    category: 'premium',
    isPro: true,
    credits: 12,
    hasRunner: true,
    hiddenFromLibrary: true,
  },
  {
    id: 'circe-protection-shield',
    name: "Circe's Aegis",
    description: 'Unified protection hub',
    longDescription:
      'Open the Aegis hub under Protection: master shield toggle, Sentinel schedule (UTC), leak scan defaults, optional Hammer auto-drafts, and links to Mentions for reputation (separate from leak alerts).',
    category: 'premium',
    isPro: true,
    badge: 'Circe Pro',
    credits: 8,
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
    badge: 'Venus Pro',
    credits: 5,
    hasRunner: true,
  },
  { id: 'standard-of-attraction', name: 'Standard of Attraction', description: 'Pro rating of how commercially attractive your content is', longDescription: 'Let Venus and Circe rate how commercially attractive your latest photos and videos are—through their eyes—before you post.', category: 'premium', isPro: true, badge: 'Pro', credits: 3, hasRunner: true, hiddenFromLibrary: true },
  {
    id: 'frame-studio',
    name: 'Frame Studio',
    description: 'Creatix-branded video editor (Frame fork)',
    longDescription:
      'Opens Media & Vault, where you can launch the Frame bridge, swap video, and use saved presets. If you self-host Frame, point the app at your deployment in environment settings so the button opens your editor. Divine can drop you straight on this hub when you ask.',
    category: 'content',
    badge: 'Beta',
    credits: 2,
    hasRunner: true,
  },
  {
    id: 'frame-ai-assist',
    name: 'Frame AI Assist',
    description: 'Editing and pacing copilot for Frame',
    longDescription:
      'Backend copilot for the Frame editor (messages in / out). Use it from Media & vault → video editor, or from a deployed Frame with your export token—not as a standalone dashboard “tool.” Divine can still invoke it by id when you ask.',
    category: 'content',
    credits: 2,
    hasRunner: true,
    hiddenFromLibrary: true,
    hiddenFromFeatured: true,
  },
  {
    id: 'ariadne-trace',
    name: 'Ariadne Trace',
    description: 'Per-recipient forensic marker on exported video',
    longDescription:
      'Embeds a discreet marker in exported vault video so if a clip leaks you have a stronger clue which copy or recipient it came from. Use Media & Vault → Ariadne on files you already store; Frame export can use the same flow. Technical details live in the Ariadne spec in the repo docs if you need them.',
    category: 'protection',
    badge: 'Pro',
    credits: 8,
    hasRunner: true,
  },
  {
    id: 'ariadne-detect',
    name: 'Ariadne Detect',
    description: 'Decode marker from a suspected leak file',
    longDescription:
      'Upload a suspected leak file; we look for an Ariadne marker and match it to your export history when possible—useful evidence before you draft a notice. Integrations can call the detect endpoint the same way the dashboard does.',
    category: 'protection',
    credits: 4,
    hasRunner: true,
    hiddenFromLibrary: true,
  },
]

export const TOOL_IDS_WITH_RUNNER = new Set(
  ALL_TOOLS_META.filter((t) => t.hasRunner && !t.comingSoon).map((t) => t.id),
)

/** Ids passed to `run_ai_studio_tool` / `runAiStudioToolServer` (Divine Manager, voice, chat). */
export const DIVINE_MANAGER_AI_STUDIO_TOOL_IDS: string[] = ALL_TOOLS_META.filter(
  (t) => t.hasRunner && !t.comingSoon,
).map((t) => t.id)

/** Legacy UI/API ids that map to the canonical row in ALL_TOOLS_META (same runner + billing). */
export const TOOL_ID_ALIASES: Record<string, string> = {
  'pricing-optimizer': 'price-optimizer',
}

export function resolveCanonicalToolId(id: string): string {
  return TOOL_ID_ALIASES[id] ?? id
}

export function getToolMeta(id: string): AIToolMeta | undefined {
  const canonical = resolveCanonicalToolId(id)
  return ALL_TOOLS_META.find((t) => t.id === canonical)
}
