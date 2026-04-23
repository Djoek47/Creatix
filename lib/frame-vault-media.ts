import 'server-only'

export const VAULT_MEDIA_BUCKET = 'vault-media'

/** Max export size (bytes) — align with bucket file_size_limit in SQL. */
export const VAULT_EXPORT_MAX_BYTES = 500 * 1024 * 1024
/** Practical per-user cap for app-managed vault media on free Supabase projects. */
export const DEFAULT_VAULT_USER_QUOTA_MB = 256

const VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'application/octet-stream'])

export function resolveVaultUserQuotaBytes(): number {
  const envRaw = Number.parseInt(process.env.VAULT_USER_QUOTA_MB ?? '', 10)
  const mb = Number.isFinite(envRaw) && envRaw > 0 ? envRaw : DEFAULT_VAULT_USER_QUOTA_MB
  return Math.max(1, mb) * 1024 * 1024
}

export function vaultExportObjectPath(userId: string, contentId: string, originalName: string): string {
  const ext = (originalName.match(/\.[a-zA-Z0-9]+$/)?.[0] || '.mp4').replace(/^\./, '')
  const safe = ext.replace(/[^a-zA-Z0-9.]/g, '').slice(0, 8) || 'mp4'
  return `${userId}/${contentId}/export-${Date.now()}.${safe}`
}

export function isAllowedVaultVideoMime(mime: string): boolean {
  const m = (mime || '').toLowerCase().split(';')[0].trim()
  if (!m) return false
  if (m.startsWith('video/')) return true
  return VIDEO_TYPES.has(m)
}
