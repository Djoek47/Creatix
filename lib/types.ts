// Database Types for CREATRIX Platform

import type { AudienceBadge } from '@/lib/fans/audience-classification'
import type { SubscriptionAccountType } from '@/lib/fans/subscription-account-type'
import type { FanProfileType } from '@/lib/fans/profile-types'

export type Platform = 'onlyfans' | 'fansly' | 'manyvids' | 'mym' | 'loyalfans'
export type FanTier = 'whale' | 'regular' | 'new' | 'inactive'
export type ContentStatus = 'draft' | 'scheduled' | 'published' | 'archived'
export type ConversationStatus = 'active' | 'pending' | 'archived'
export type LeakSeverity = 'critical' | 'high' | 'medium' | 'low'

/** Row `leak_alerts.media_type` — from AI triage + URL heuristics */
export type LeakMediaType = 'video' | 'photo' | 'unknown'

/** Row `leak_alerts.status` — detection / triage (distinct from `user_case_status`). */
export type LeakDetectionStatus =
  | 'pending'
  | 'reviewed'
  | 'confirmed'
  | 'ignored'
  | 'dmca_sent'
  | 'detected'
  | 'reviewing'
  | 'resolved'
  | 'false_positive'
  | 'scam'

/** Creator workflow on a leak alert (distinct from detection status) */
export type LeakUserCaseStatus =
  | 'open'
  | 'resolved'
  | 'contacted'
  | 'unresolved'
  | 'needs_help'
  | 'snoozed'
  | 'waived'

/** How the creator wants distribution interpreted for this case */
export type LeakDistributionIntent =
  | 'unspecified'
  | 'paid_only_elsewhere'
  | 'ok_if_free'
  | 'cross_post_consented'
export type MentionSentiment = 'positive' | 'neutral' | 'negative'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  timezone: string
  notification_preferences: NotificationPreferences
  encrypted_birthday: string | null
  birthday_passphrase_hash: string | null
  has_birthday_set: boolean
  /** Prior platform handles for leak search (rebrands) */
  former_usernames?: string[] | null
  /** Manual content title hints for leak search */
  leak_search_title_hints?: string[] | null
  /** Manual @handles for reputation scans without OAuth */
  reputation_manual_handles?: string[] | null
  /** Optional real/stage name for indexed reputation search context */
  reputation_display_name?: string | null
  /** Optional platform usernames e.g. { "onlyfans": "x", "mym": "y" } */
  reputation_platform_handles?: Record<string, string> | null
  created_at: string
  updated_at: string
}

export interface NotificationPreferences {
  email_notifications: boolean
  leak_alerts: boolean
  reputation_alerts: boolean
  daily_digest: boolean
}

/** Populated on fans dashboard for classification column / filters. */
export type FanAudienceMeta = {
  isWhaleOrVip: boolean
  isCreatorLikely: boolean
  badges: AudienceBadge[]
}

export interface Fan {
  id: string
  user_id: string
  platform: Platform
  /** OnlyFans / upstream platform user id (for API calls). */
  platform_fan_id?: string | null
  platform_username: string
  display_name: string | null
  avatar_url: string | null
  tier: FanTier
  total_spent: number
  /** Listed subscription price from platform when known (USD / period). */
  subscription_price?: number | null
  /** Free-page vs paid tier when derivable from price or sync. */
  subscription_account_type?: SubscriptionAccountType
  /** Partial revenue breakdown (null = not tracked yet for this row). */
  spend_subscriptions?: number | null
  spend_tips?: number | null
  spend_messages?: number | null
  spend_posts?: number | null
  subscription_start: string | null
  /** Current period end from OnlyFans/Fansly sync (ISO). */
  subscription_expires_at?: string | null
  subscription_renews_on?: string | null
  last_interaction: string | null
  notes: string | null
  tags: string[]
  is_favorite: boolean
  is_blocked: boolean
  created_at: string
  updated_at: string
  /** Server-derived when loading /dashboard/fans from DB + thread insights. */
  audience?: FanAudienceMeta
  /** Optional explicit manual profile type for CRM (null = backend-derived). */
  audience_profile_override?: FanProfileType | null
}

export interface Content {
  id: string
  user_id: string
  title: string
  description: string | null
  media_urls: string[]
  platforms: Platform[]
  status: ContentStatus
  scheduled_at: string | null
  published_at: string | null
  performance_metrics: PerformanceMetrics
  tags: string[]
  created_at: string
  updated_at: string
}

export interface PerformanceMetrics {
  views: number
  likes: number
  comments: number
  shares: number
  revenue: number
}

export interface Conversation {
  id: string
  user_id: string
  fan_id: string
  platform: Platform
  status: ConversationStatus
  last_message_at: string | null
  unread_count: number
  created_at: string
  updated_at: string
  fan?: Fan
}

export interface Message {
  id: string
  conversation_id: string
  sender_type: 'creator' | 'fan'
  content: string
  media_urls: string[]
  is_ppv: boolean
  ppv_price: number | null
  is_read: boolean
  sent_at: string
}

export interface DmcaClaim {
  id: string
  user_id: string
  leak_alert_id: string | null
  infringing_url: string
  platform: string
  platform_username: string | null
  claimant_name: string
  claimant_email: string
  status: 'draft' | 'sent' | 'acknowledged' | 'removed' | 'rejected' | 'appealed' | string
  notice_text: string | null
  sent_at: string | null
  response_at: string | null
  response_notes: string | null
  created_at: string
  updated_at: string
}

export interface LeakAlert {
  id: string
  user_id: string
  source_url: string
  /** Dedupe key — `normalizeUrl(source_url)`; maintained by leak scan + APIs */
  normalized_source_url?: string | null
  source_platform: string
  matched_content_id: string | null
  severity: LeakSeverity
  /** Detection pipeline status (e.g. detected, reviewing, resolved, scam) */
  status: LeakDetectionStatus | string
  detected_at: string
  resolved_at: string | null
  notes: string | null
  user_case_status?: LeakUserCaseStatus
  snooze_until?: string | null
  creator_distribution_intent?: LeakDistributionIntent | null
  /** One-line from Grok for list views */
  ai_nuance_summary?: string | null
  /** video | photo | unknown */
  media_type?: LeakMediaType
  /** Same canonical URL seen again after resolve */
  reappearance_count?: number
  last_seen_at?: string | null
}

export type ReputationScanChannel = 'web_wide' | 'social'
export type AiReputationImpact = 'harmful' | 'helpful' | 'neutral'
export type AiRecommendedReputationAction = 'reply' | 'report' | 'monitor' | 'ignore'

/** Grok multi-tone replies (optional); primary mirrors ai_suggested_reply */
export type AiReplyVariants = {
  warm?: string
  professional?: string
  witty?: string
  primary?: string
}

export interface ReputationMention {
  id: string
  user_id: string
  // Source platform/host where the mention was found (e.g. twitter, reddit)
  platform: string
  // Canonical URL for the mention
  source_url: string
  title?: string | null
  content_preview: string
  sentiment: MentionSentiment
  author: string | null
  detected_at: string
  is_reviewed: boolean
  /** Serper pass: wide web vs social-focused */
  scan_channel?: ReputationScanChannel | null
  // Optional AI enrichment fields (filled by Grok for Pro users)
  ai_category?: string | null
  ai_rationale?: string | null
  ai_suggested_reply?: string | null
  ai_reputation_impact?: AiReputationImpact | null
  ai_recommended_action?: AiRecommendedReputationAction | null
  ai_reply_variants?: AiReplyVariants | null
}

export interface AnalyticsSnapshot {
  id: string
  user_id: string
  date: string
  platform: string
  total_fans: number
  revenue: number
  messages_received: number
  messages_sent: number
  new_fans: number
  churned_fans: number
  avg_response_time_minutes: number
  top_content_id: string | null
  created_at: string
}

// Dashboard Stats
export interface DashboardStats {
  totalRevenue: number
  revenueChange: number | null
  totalFans: number
  fansChange: number | null
  activeConversations: number
  conversationsChange: number | null
  scheduledContent: number
  contentChange: number | null
  leakAlerts: number
  mentionsToReview: number
  hasConnectedPlatforms: boolean
}

// Chart Data Types
export interface RevenueChartData {
  date: string
  onlyfans: number
  mym: number
  fansly: number
}

export interface FanGrowthData {
  date: string
  newFans: number
  churned: number
  net: number
}
