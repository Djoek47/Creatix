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
      'Upload a photo or short video (we analyze a key frame), or describe content with text or voice. AI sees the image when provided and returns platform-ready captions, hashtags, and PPV copy. For video, you can also ask for hook → beats → on-screen text → CTA in one pass—this replaces the old standalone “Video Script AI” tool.',
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
      'Configure per-fan automations on the AI Chatter dashboard: Mimic-aware drafts, queue/review by default, optional opt-in auto-send with beta acknowledgment. Opens from AI Studio → Tools or /dashboard/ai-studio/chatter.',
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
      'Full UI at **Dashboard → Commenter** (/dashboard/commenter). Ingests OnlyFans post/story/stream comments via webhooks and optional API sync. AI scores connotation, enriches fan profiles, drafts Circe (purple), Venus (gold), Flirt (pink), and Professional (neutral) public replies plus a Best pick — review only; copy to OnlyFans yourself. Flags stalking or high-risk comments for Divine notifications. Optional bolder monetization: divine_manager_settings.automation_rules JSON key commenter.sales_intensity to "bold". **Housekeeping** (smart list sync) lives on the same page.',
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
      '**Smart classify** keeps fans sorted by **lifetime spend**, **DM/thread activity** (recent chat, “active chatter”), cold/low-engagement, and **freeloaders** (new vs long-tenure splits). Rules live in **Fans → Arrangements** (`housekeeping_lists`) and the **Housekeeping** section on **Dashboard → Commenter** — map each segment to OnlyFans user lists and Fansly CRM tags. Cron `housekeeping-fan-lists` syncs platforms so whales, spenders, subscribers-without-upsell, recent subs, and freeloader buckets stay current. Pair with Commenter so public-comment signals feed the same CRM.',
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
      'Suggest gifts using fan context and optional budget. Save HTTPS product links on the Gift wishlist page (AI Studio) so runs can reference real items and prices.',
    category: 'engagement',
    credits: 1,
    hasRunner: true,
  },
  {
    id: 'whale-whisperer',
    name: 'Whale Whisperer',
    description: 'VIP draft-only chatter',
    longDescription:
      'Opens AI Chatter in Whale whisper mode: same thread + Mimic context as chatter, but nothing auto-sends—every line is queued for you to send from Messages. Add VIP fans from the Fans table or Chatter dashboard.',
    category: 'engagement',
    credits: 2,
    hasRunner: true,
  },
  {
    id: 'price-optimizer',
    name: 'Price Optimizer',
    description: 'Optimal pricing suggestions',
    longDescription:
      'Suggests subscription, PPV, and custom pricing angles from your context. **Not shown in the AI Studio grid** — use **Divine Manager** (chat or voice: `run_ai_studio_tool` with `toolId` `price-optimizer` or `pricing-optimizer`) to run it.',
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
      'Suggests bundle price points and fan-facing teaser copy from your goal, fan context, and vault metadata. **Not shown in the AI Studio grid** — use **Divine Manager** (`recommend_dm_bundle` or `run_ai_studio_tool` with `toolId` `dm-bundle-pricing`).',
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
    id: 'viral-predictor',
    name: 'Viral Predictor',
    description: 'Content success prediction',
    longDescription:
      'Scores likely engagement before you post. **Hidden from the AI Studio grid** — use **Divine Manager** (`predict_viral` / `run_ai_studio_tool` with `toolId` `viral-predictor`) or voice mode.',
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
      '**Circe\'s Oracle** merged here: predict which fans are most likely to churn and what to do next. Hub: **Dashboard → Retention** schedules batch digests (expiring subs + quiet actives), Divine notifications, and stored reports. In AI Studio, run a single-fan deep dive with CRM + thread context (same engine as before—now one tool).',
    category: 'analytics',
    credits: 3,
    hasRunner: true,
  },
  {
    id: 'retention-tease',
    name: 'Retention content tease',
    description: 'Future-drop & calendar teasers for churn risk',
    longDescription:
      'On **Dashboard → Retention**, add optional calendar notes and run a batch digest: Circe suggests feed/story/DM teasers for subscribers at risk, aligned with your upcoming content. Uses the same credits per run as background Churn Predictor.',
    category: 'analytics',
    credits: 3,
    hasRunner: true,
  },
  {
    id: 'income-predictor',
    name: 'Income Predictor',
    description: 'Partner forecast + cadence + next-month goals',
    longDescription:
      'Merges the OnlyFans partner statistical forecast with your synced snapshots, post rate, weekly/monthly cadence buckets, leak context, and goal realism (including intermediate revenue bands). Hub: **Dashboard → Analytics → Income Predictor**.',
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
      'Pro-only: **compares you to competitors** using your CRM-imported fan count against **anonymized Creatix cohort bands** (same stat range as you, then **one tier above**), plus optional live web discovery (Serper), the shared best-practices library, and Community tips. Name public @handles or positioning notes so the run can contrast peers in your band vs the next tier up. No paywalled scraping or private competitor metrics.',
    category: 'premium',
    isPro: true,
    credits: 12,
    hasRunner: true,
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
      'Opens the **Media & vault** hub where you can launch the Frame bridge, replace video, and use vault presets. Deploy your Frame fork separately and set `NEXT_PUBLIC_FRAME_URL` on Vercel. Divine can deep-link here.',
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
      'Server-side assistant via `POST /api/frame/ai/assist` — same billing as other AI tools. Call from the Frame deployment with `Authorization: Bearer <exportToken>` from `frame-session`, or from the logged-in dashboard.',
    category: 'content',
    credits: 2,
    hasRunner: true,
    hiddenFromLibrary: true,
  },
  {
    id: 'ariadne-trace',
    name: 'Ariadne Trace',
    description: 'Per-recipient forensic marker on exported video',
    longDescription:
      'Embeds a signed **append-v1** marker in vault video (MVP) so leaks can be traced to a recipient key. Use **Media & vault → Ariadne** for existing library files; Frame export can call the same API. See [`docs/ariadne-technical-spec.md`](../docs/ariadne-technical-spec.md).',
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
      'Upload a video file; we scan for an Ariadne append-v1 payload and match it to your export records. Powers future DMCA pre-fill. **API:** `POST /api/ariadne/detect` (multipart).',
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
