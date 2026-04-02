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
}

// Icon names only; actual icons are resolved in the component that renders (tools page / library)
export const ALL_TOOLS_META: AIToolMeta[] = [
  { id: 'caption-generator', name: 'Caption Generator', description: 'Vision + voice captions for your media', longDescription: 'Upload a photo or short video (we analyze a key frame), or describe content with text or voice. AI sees the image when provided and generates platform-ready captions, hashtags, and PPV copy.', category: 'content', badge: 'Popular', credits: 1, hasRunner: true },
  { id: 'fantasy-writer', name: 'Fantasy Writer', description: 'Roleplay tied to calendar & fans', longDescription: 'Generate DMs-ready fantasy from your cosmic calendar events, a scheduled content item, and/or a specific fan profile — plus optional scenario text or voice.', category: 'content', badge: 'Popular', credits: 2, hasRunner: true },
  { id: 'content-ideas', name: 'Content Ideas', description: 'Trending content suggestions', longDescription: 'Get AI-powered content ideas based on trending topics, your niche, and what performs best for similar creators.', category: 'content', credits: 1, hasRunner: true },
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
  { id: 'mood-detector', name: 'Mood Detector', description: 'Analyze fan emotional state', longDescription: 'Understand your fans better by analyzing message sentiment to tailor your responses and content.', category: 'engagement', badge: 'New', credits: 1, hasRunner: true },
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
  { id: 'price-optimizer', name: 'Price Optimizer', description: 'Optimal pricing suggestions', longDescription: 'AI analyzes your engagement data to suggest optimal pricing for subscriptions, PPV, and custom content.', category: 'analytics', credits: 2, hasRunner: true },
  { id: 'dm-bundle-pricing', name: 'DM Bundle Pricing', description: 'PPV / paid DM bundle price and copy', longDescription: 'Used by Divine Manager to suggest bundle pricing and fan-facing teaser copy from your goal, fan context, and vault summary.', category: 'engagement', credits: 1, hasRunner: true },
  { id: 'viral-predictor', name: 'Viral Predictor', description: 'Content success prediction', longDescription: 'Predict which content is most likely to go viral before you post, based on trending patterns and your audience.', category: 'analytics', badge: 'Beta', credits: 2, hasRunner: true },
  { id: 'churn-predictor', name: 'Churn Predictor', description: 'Retention from CRM + thread context', longDescription: 'Uses spend level, subscription status, optional thread snapshot, and your notes to score churn risk and suggest treats, timing, and win-back copy.', category: 'analytics', credits: 2, hasRunner: true },
  {
    id: 'leak-scanner',
    name: 'Leak Scanner',
    description: 'Scheduled leak detection (Aegis)',
    longDescription:
      'Configure background web scans under Protection → Circe’s Aegis: same Serper + Grok pipeline as manual Protection scan, on your chosen cadence. Review every candidate before acting.',
    category: 'protection',
    credits: 3,
    hasRunner: true,
  },
  {
    id: 'dmca-automator',
    name: 'DMCA Automator',
    description: 'Auto-draft notices (you send)',
    longDescription:
      'From Aegis: optionally auto-create draft DMCA claims for high-severity leaks. Nothing is filed with hosts automatically — open Protection to review, edit, and send each notice yourself.',
    category: 'protection',
    credits: 2,
    hasRunner: true,
  },
  { id: 'voice-cloning', name: 'Voice Cloning', description: 'Clone your voice for responses', longDescription: 'Create an AI clone of your voice to send personalized audio messages at scale.', category: 'premium', isPro: true, credits: 5, hasRunner: true },
  { id: 'video-script-ai', name: 'Video Script AI', description: 'Generate video scripts', longDescription: 'Create engaging video scripts tailored to your style, including intros, outros, and calls-to-action.', category: 'premium', isPro: true, credits: 3, hasRunner: false },
  { id: 'competitor-analysis', name: 'Competitor Analysis', description: 'AI-powered competitor insights', longDescription: 'Analyze competitor strategies, pricing, and content to stay ahead of the competition.', category: 'premium', isPro: true, credits: 5, hasRunner: false },
  { id: 'circe-oracle', name: "Circe's Oracle", description: 'Deep retention prophecies', longDescription: 'Like the enchantress who foresaw the future, receive prophetic insights on subscriber behavior and loyalty patterns.', category: 'premium', isPro: true, badge: 'Circe Pro', credits: 4, hasRunner: true },
  { id: 'circe-transformation', name: "Circe's Transformation", description: 'Transform casual fans into whales', longDescription: 'Just as Circe transformed men, this AI identifies and nurtures casual fans with potential to become high-value supporters.', category: 'premium', isPro: true, badge: 'Circe Pro', credits: 4, hasRunner: true },
  {
    id: 'circe-protection-shield',
    name: "Circe's Aegis",
    description: 'Unified protection hub',
    longDescription:
      'Open the Aegis hub under Protection: master shield toggle, Sentinel schedule (UTC), leak scan defaults, optional Hammer auto-drafts, and links to Mentions for reputation (separate from leak alerts).',
    category: 'premium',
    isPro: true,
    badge: 'Circe Pro',
    credits: 6,
    hasRunner: true,
  },
  { id: 'venus-attraction', name: "Venus's Allure", description: 'Magnetic content optimization', longDescription: 'Channel the goddess of beauty to optimize your content for maximum attraction and new subscriber conversion.', category: 'premium', isPro: true, badge: 'Venus Pro', credits: 4, hasRunner: true },
  { id: 'venus-cupid', name: "Cupid's Arrow", description: 'Target perfect new fans', longDescription: "Like Venus's son Cupid, this AI identifies and targets potential fans most likely to fall in love with your content.", category: 'premium', isPro: true, badge: 'Venus Pro', credits: 5, hasRunner: true },
  { id: 'venus-garden', name: "Venus's Garden", description: 'Cultivate fan relationships', longDescription: 'Nurture your fan community like a divine garden, with AI-powered relationship management and engagement strategies.', category: 'premium', isPro: true, badge: 'Venus Pro', credits: 4, hasRunner: true },
  { id: 'divine-forecast', name: 'Divine Forecast', description: 'Revenue and growth predictions', longDescription: 'Receive divine prophecies about your revenue trajectory, growth potential, and optimal business decisions.', category: 'premium', isPro: true, badge: 'Agency', credits: 8, hasRunner: true },
  { id: 'standard-of-attraction', name: 'Standard of Attraction', description: 'Pro rating of how commercially attractive your content is', longDescription: 'Let Venus and Circe rate how commercially attractive your latest photos and videos are—through their eyes—before you post.', category: 'premium', isPro: true, badge: 'Pro', credits: 3, hasRunner: true },
]

export const TOOL_IDS_WITH_RUNNER = new Set(
  ALL_TOOLS_META.filter((t) => t.hasRunner).map((t) => t.id)
)

export function getToolMeta(id: string): AIToolMeta | undefined {
  return ALL_TOOLS_META.find((t) => t.id === id)
}
