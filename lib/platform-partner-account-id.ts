/**
 * Resolve partner API account ids from `platform_connections` rows.
 * Canonical storage is `access_token`; some rows only have `platform_user_id`.
 */

export function onlyFansPartnerAccountIdFromRow(
  row: { access_token?: string | null; platform_user_id?: string | null } | null | undefined,
): string | null {
  if (!row) return null
  if (row.access_token != null && String(row.access_token).trim() !== '') return String(row.access_token)
  if (row.platform_user_id != null && String(row.platform_user_id).trim() !== '') return String(row.platform_user_id)
  return null
}

export function fanslyPartnerAccountIdFromRow(
  row: { access_token?: string | null; platform_user_id?: string | null } | null | undefined,
): string | null {
  if (!row) return null
  if (row.access_token != null && String(row.access_token).trim() !== '') return String(row.access_token)
  if (row.platform_user_id != null && String(row.platform_user_id).trim() !== '') return String(row.platform_user_id)
  return null
}
