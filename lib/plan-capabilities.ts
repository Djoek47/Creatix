import type { ProtectionEntitlementFields, SubscriptionLike } from '@/lib/billing/access'
import { isProtectionOnlyTier } from '@/lib/billing/access'

export type ProductMode = 'default' | 'non_api_protection'

export type WorkspaceCapabilities = {
  isNonApiProtectionTier: boolean
  canUseMessaging: boolean
  canUseSocialAutomation: boolean
  canUseAiStudioNav: boolean
  canUseDivineManagerNav: boolean
  canUseRetentionNav: boolean
  canUseCommenterNav: boolean
  canUsePlatformIntegrationsSettings: boolean
  showUpgradeToFullPlanCta: boolean
}

export function resolveProductMode(env: NodeJS.ProcessEnv = process.env): ProductMode {
  const v = env.CREATIX_PRODUCT_MODE?.trim().toLowerCase()
  if (v === 'non_api_protection') return 'non_api_protection'
  return 'default'
}

function capsForNonApi(): WorkspaceCapabilities {
  return {
    isNonApiProtectionTier: true,
    canUseMessaging: false,
    canUseSocialAutomation: false,
    canUseAiStudioNav: false,
    canUseDivineManagerNav: false,
    canUseRetentionNav: false,
    canUseCommenterNav: false,
    canUsePlatformIntegrationsSettings: false,
    showUpgradeToFullPlanCta: true,
  }
}

function capsFull(): WorkspaceCapabilities {
  return {
    isNonApiProtectionTier: false,
    canUseMessaging: true,
    canUseSocialAutomation: true,
    canUseAiStudioNav: true,
    canUseDivineManagerNav: true,
    canUseRetentionNav: true,
    canUseCommenterNav: true,
    canUsePlatformIntegrationsSettings: true,
    showUpgradeToFullPlanCta: false,
  }
}

export type SubscriptionCapsRow = (SubscriptionLike & ProtectionEntitlementFields) | null | undefined

/**
 * Single capability contract for UI + API guards.
 * When `CREATIX_PRODUCT_MODE=non_api_protection`, all users are treated as non-API (staging).
 */
export function resolveWorkspaceCapabilities(row: SubscriptionCapsRow): WorkspaceCapabilities {
  if (resolveProductMode(process.env) === 'non_api_protection') {
    return capsForNonApi()
  }
  if (isProtectionOnlyTier(row)) {
    return capsForNonApi()
  }
  return capsFull()
}

export function getNonApiUpgradeMessage(): string {
  return 'Add a full Creatix plan anytime to unlock creator API connections, messaging, AI Studio, and automation — your protection data stays put.'
}
