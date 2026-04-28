/**
 * Per-user budget for app-managed Supabase Storage (`vault-media`), in megabytes.
 * Product default when `VAULT_USER_QUOTA_MB` is unset (must match operational default in `lib/frame-vault-media.ts`).
 */
export const APP_USER_STORAGE_LIMIT_MB = 256

/**
 * Resolved quota in MB: `VAULT_USER_QUOTA_MB` when set on the server, otherwise {@link APP_USER_STORAGE_LIMIT_MB}.
 * On the client bundle `VAULT_USER_QUOTA_MB` is not available, so this returns the product default there.
 */
export function resolveAppVaultQuotaMb(): number {
  const envRaw = Number.parseInt(process.env.VAULT_USER_QUOTA_MB ?? '', 10)
  if (Number.isFinite(envRaw) && envRaw > 0) return Math.max(1, envRaw)
  return APP_USER_STORAGE_LIMIT_MB
}
