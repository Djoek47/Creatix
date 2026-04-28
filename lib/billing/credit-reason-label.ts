/** Human-facing labels for credit_transaction.reason_code (settings / spend reports). */

const KNOWN: Record<string, string> = {
  'ai usage': 'AI workspace',
  'ariadne trace': 'Ariadne trace',
  'message generation light': 'Message generation · light',
  'message generation medium': 'Message generation · standard',
  'message generation heavy': 'Message generation · rich',
  'message send platform': 'Platform messaging',
  'markit attribution analyze': 'Attribution analytics',
  'markit attribution': 'Market attribution',
  'dm compose': 'DM compose',
  'voice clone': 'Voice cloning',
  'vault import': 'Vault import',
}

function titleParts(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export function labelForCreditReason(reasonCodeOrHuman: string): string {
  const k = reasonCodeOrHuman.trim().toLowerCase()
  if (KNOWN[k]) return KNOWN[k]
  return titleParts(reasonCodeOrHuman.replace(/_/g, ' ').trim())
}
