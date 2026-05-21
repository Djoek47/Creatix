import { resolveAppVaultQuotaMb } from '@/lib/billing/app-storage-cap'

/**
 * Storage caps keyed off `subscriptions.plan_id`. Same MB as enforced vault quota (`VAULT_USER_QUOTA_MB` / default).
 * AI credits are not set here — use {@link computeMonthlyCreditAllowance}.
 */
export function getPlanLimits(_planId: string) {
  void _planId
  return { storage_limit_mb: resolveAppVaultQuotaMb() }
}
