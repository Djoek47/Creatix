/**
 * Human-facing labels for `credit_transactions.reason_code` (+ optional metadata) in Settings → Usage.
 */

import { englishToolName } from '@/lib/ai/ai-tools-english-copy'
import { getToolMeta, resolveCanonicalToolId } from '@/lib/ai-tools-data'

/** Merged onto `credit_transactions.metadata` when debiting via the wallet RPC. */
export const LEDGER_SERVICE_DISPLAY_METADATA_KEY = 'service_display_name'

/** Canonical AI Studio / route billing id — drives exact tool titles in Settings → Usage. */
export const LEDGER_BILLING_TOOL_ID_METADATA_KEY = 'billing_tool_id'

/** Canonical tool / API debit ids passed to ledger not yet in AI Studio catalog. */
const ROUTE_TOOL_DISPLAY: Record<string, string> = {
  'brand-lint': 'Brand Lint',
  'mass-dm-composer': 'Mass DM Composer',
}

/** Non-tool ledger codes (underscores normalized away for lookups). */
const LEDGER_REASON_LABELS: Record<string, string> = {
  // Legacy / umbrella
  'ai usage': 'Creator AI usage',

  // Messaging & Divine Manager
  'message generation light': 'Message suggestions',
  'divine manager live voice': 'Divine Manager · Live voice (Realtime)',
  'message generation medium': 'Message generation · standard',
  'message generation heavy': 'Message generation · rich',
  'message generation bundle': 'Multi-source message pack',
  'message send platform': 'Messages (platform send)',
  'mass campaign send': 'Mass campaign send',
  'dm compose': 'DM compose',

  // Product surfaces
  'leak scan': 'Leak Scanner',
  'leak attribution': 'Leak attribution',
  'reputation web scan': 'Mentions web scan',
  'voice clone': 'Voice cloning',
  'vault import': 'Vault import',
  'creator mood pulse': 'Creator mood pulse',
  'dmca claim': 'DMCA claim intake',
  'viral predictor': 'Viral predictor',
  'revenue optimizer': 'Revenue optimizer',
  'dm bundle pricing': 'DM bundle pricing',

  // Goddess / chat assistants (not billed as AI Studio tools)
  'divine chat circe': 'Circe',
  'divine chat venus': 'Venus',
  'divine chat flirt': 'Flirt mode',

  // Ariadne · Markit
  'ariadne trace': 'Ariadne trace export',
  'ariadne detect': 'Ariadne leak-file scan',
  'markit attribution analyze': 'Markit attribution analysis',
  'markit attribution': 'Markit attribution',

  // OnlyFans helpers
  'onlyfans bio serper fallback': 'OnlyFans bio enrichment',
  'fan web bio serper ai': 'Fan profile · Web bio + creator check',

  // Guidance (draft flow — distinct ledger key from generic `dmca claim`)
  'dmca claim draft': 'DMCA claim draft',
  'retention churn digest': 'Retention digest (Churn)',

  // Wallet credits (shown as positive lines)
  'monthly included grant': 'Included monthly credits',
  'stripe topup grant': 'Credit top-up (checkout)',
  'stripe auto topup grant': 'Auto top-up',

  // Aliases sometimes written with different spacing from older clients
  'ariadne trace export': 'Ariadne trace export',
}

export function normalizeLedgerReasonKey(reason: string): string {
  return reason
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
}

function titleCaseWords(s: string): string {
  const t = s.trim()
  if (!t) return 'Creator AI usage'
  return t
    .split(/\s+/)
    .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/** Display name shown in ledger for a billing tool id (AI Studio runner / overrides). */
export function serviceDisplayForBillingTool(billingToolId: string): string {
  const id = billingToolId.trim()
  if (!id) return 'Creator AI usage'
  const canonical = resolveCanonicalToolId(id)
  const routed = ROUTE_TOOL_DISPLAY[id] ?? ROUTE_TOOL_DISPLAY[canonical]
  if (routed) return routed
  if (getToolMeta(canonical)) return englishToolName(canonical)
  return titleCaseWords(canonical.replace(/-/g, ' '))
}

export function ledgerDebitOptsForBillingTool(toolId: string): {
  reasonCode: string
  metadata: Record<string, string>
} {
  const canonical = resolveCanonicalToolId(toolId.trim())
  return {
    reasonCode: `tool_${canonical.replace(/-/g, '_')}`,
    metadata: { [LEDGER_SERVICE_DISPLAY_METADATA_KEY]: serviceDisplayForBillingTool(canonical) },
  }
}

function readMetadataDisplay(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const v = metadata[LEDGER_SERVICE_DISPLAY_METADATA_KEY]
  if (typeof v === 'string') {
    const t = v.trim()
    return t.length > 0 ? t : null
  }
  return null
}

function readBillingToolId(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const v = metadata[LEDGER_BILLING_TOOL_ID_METADATA_KEY]
  if (typeof v === 'string') {
    const t = v.trim()
    return t.length > 0 ? t : null
  }
  return null
}

function inferToolServiceName(reasonCodeRaw: string, options?: CreditLedgerLabelOptions): string | null {
  const trimmed = reasonCodeRaw.trim()
  const m = /^tool_(.+)$/i.exec(trimmed)
  if (!m) return null
  const slugHyphen = m[1].replace(/_/g, '-')
  const canonical = resolveCanonicalToolId(slugHyphen)
  if (options?.resolveToolDisplayName) {
    const v = options.resolveToolDisplayName(canonical).trim()
    if (v) return v
  }
  return serviceDisplayForBillingTool(slugHyphen)
}

/**
 * One line shown after "Debit ·" / "Credit ·" using DB reason + merged metadata when present.
 * Prefers the **exact billed tool** (catalog title) when `billing_tool_id` or `tool_*` reason is available.
 */
export type CreditLedgerLabelOptions = {
  /** When set, overrides English catalog names for AI Studio tool ids in the UI. */
  resolveToolDisplayName?: (billingToolId: string) => string
}

export function creditLedgerLineLabel(
  reasonCode: string,
  metadata?: Record<string, unknown> | null,
  options?: CreditLedgerLabelOptions,
): string {
  const meta = metadata ?? undefined
  const fromMeta = readMetadataDisplay(meta)
  /** Divine Manager debits set the full line in `service_display_name` — show it verbatim. */
  if (fromMeta && fromMeta.startsWith('Divine Manager')) {
    return fromMeta
  }

  const toolId = readBillingToolId(meta)
  const fromToolId = toolId
    ? options?.resolveToolDisplayName?.(toolId) ?? serviceDisplayForBillingTool(toolId)
    : null
  const fromReasonTool = inferToolServiceName(reasonCode, options)
  const toolTitle = fromToolId ?? fromReasonTool

  if (toolTitle) {
    const umbrella = fromMeta === 'Creator AI usage' || fromMeta === LEDGER_REASON_LABELS['ai usage']
    if (!fromMeta || umbrella || fromMeta === toolTitle) {
      return toolTitle
    }
    return `${toolTitle} · ${fromMeta}`
  }

  if (fromMeta) return fromMeta

  const k = normalizeLedgerReasonKey(reasonCode)
  if (LEDGER_REASON_LABELS[k]) return LEDGER_REASON_LABELS[k]
  return titleCaseWords(reasonCode.replace(/_/g, ' '))
}

/** @deprecated Prefer {@link creditLedgerLineLabel}; kept for callers without metadata. */
export function labelForCreditReason(reasonCodeOrHuman: string): string {
  return creditLedgerLineLabel(reasonCodeOrHuman)
}
