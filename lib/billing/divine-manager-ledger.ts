/**
 * Consistent credit-ledger + usage attribution when work runs through Divine Manager
 * (chat, voice tools, context tools). Settings → Usage shows lines like:
 * "Divine Manager · Leak Scanner" with the debited credit amount.
 */

import { resolveCanonicalToolId } from '@/lib/ai-tools-data'
import {
  LEDGER_BILLING_TOOL_ID_METADATA_KEY,
  LEDGER_SERVICE_DISPLAY_METADATA_KEY,
  serviceDisplayForBillingTool,
} from '@/lib/billing/credit-reason-label'

export const DIVINE_MANAGER_LEDGER_PREFIX = 'Divine Manager'

/** Merged into wallet RPC metadata for analytics / future usage UI filters. */
export const DIVINE_USAGE_PARENT_METADATA_KEY = 'divine_usage_parent'

export function divineManagerSubserviceDisplayName(subservice: string): string {
  const t = subservice.trim()
  if (!t) return DIVINE_MANAGER_LEDGER_PREFIX
  if (t.startsWith(DIVINE_MANAGER_LEDGER_PREFIX)) return t
  return `${DIVINE_MANAGER_LEDGER_PREFIX} · ${t}`
}

/**
 * Metadata for `consumeAiCredits` when the debit is attributable to Divine Manager.
 * Prefer `billingToolId` when the charge should still align to a catalog tool (credits amount from {@link getCreditsForToolId}).
 */
export function divineManagerDebitMetadata(
  subserviceName: string,
  billingToolId?: string | null,
): Record<string, string> {
  const meta: Record<string, string> = {
    [LEDGER_SERVICE_DISPLAY_METADATA_KEY]: divineManagerSubserviceDisplayName(subserviceName),
    [DIVINE_USAGE_PARENT_METADATA_KEY]: 'divine_manager',
  }
  if (billingToolId && billingToolId.trim()) {
    meta[LEDGER_BILLING_TOOL_ID_METADATA_KEY] = resolveCanonicalToolId(billingToolId.trim())
  }
  return meta
}

/** Human label for a catalog tool under Divine (e.g. "Caption generator" → "Divine Manager · Caption generator"). */
export function divineManagerDebitMetadataForToolId(billingToolId: string): Record<string, string> {
  const canonical = resolveCanonicalToolId(billingToolId.trim())
  return divineManagerDebitMetadata(serviceDisplayForBillingTool(canonical), canonical)
}

/** Use when the display line is already computed (e.g. "Divine Manager · Mentions web scan"). */
export function divineManagerDebitMetadataFixedLine(serviceDisplayName: string): Record<string, string> {
  const line = serviceDisplayName.trim()
  return {
    [LEDGER_SERVICE_DISPLAY_METADATA_KEY]: line.startsWith(DIVINE_MANAGER_LEDGER_PREFIX)
      ? line
      : divineManagerSubserviceDisplayName(line),
    [DIVINE_USAGE_PARENT_METADATA_KEY]: 'divine_manager',
  }
}
