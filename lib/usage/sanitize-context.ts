const SENSITIVE_KEYS = new Set(
  [
    'authorization',
    'cookie',
    'cookies',
    'password',
    'secret',
    'apikey',
    'api_key',
    'access_token',
    'refresh_token',
    'token',
    'bearer',
    'x-api-key',
    'stripe',
    'credit',
  ].map((k) => k.toLowerCase()),
)

function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase()
  if (SENSITIVE_KEYS.has(k)) return true
  return k.includes('password') || k.includes('secret') || k.includes('token')
}

/**
 * Shallow-redact context objects for api_error_logs.safe_context.
 * Truncate string values; drop or mask sensitive keys.
 */
export function sanitizeSafeContext(input: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!input || typeof input !== 'object') return null
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (isSensitiveKey(key)) {
      out[key] = '[redacted]'
      continue
    }
    if (typeof value === 'string') {
      out[key] = value.length > 2000 ? `${value.slice(0, 2000)}…` : value
    } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      out[key] = value
    } else if (Array.isArray(value)) {
      out[key] = value.slice(0, 50)
    } else if (typeof value === 'object') {
      out[key] = '[object]'
    } else {
      out[key] = String(value).slice(0, 500)
    }
  }
  const s = JSON.stringify(out)
  if (s.length > 8000) {
    return { _truncated: true, _note: 'context exceeded size cap' }
  }
  return out
}
