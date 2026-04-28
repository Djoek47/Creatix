import type { SupabaseClient, User } from '@supabase/supabase-js'
import { decryptLocationPayload, type StoredLocationPayload } from '@/lib/location-vault'

function parseLocationFallback(raw: unknown): { encrypted: string; hint?: string | null } | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (typeof row.encrypted !== 'string') return null
  return {
    encrypted: row.encrypted,
    hint: typeof row.hint === 'string' ? row.hint : null,
  }
}

/** Decrypted saved location only (no meteorology); null if vault empty. */
export async function resolveDecryptedObservationSite(
  supabase: SupabaseClient,
  user: User,
): Promise<{ latitude: number; longitude: number; labelHint: string | null } | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('encrypted_location, location_hint')
    .eq('id', user.id)
    .maybeSingle()

  const fallbackVault = parseLocationFallback(
    ((user.user_metadata ?? {}) as Record<string, unknown>).location_vault,
  )
  const encryptedLocation = profile?.encrypted_location ?? fallbackVault?.encrypted ?? null
  const hint = profile?.location_hint ?? fallbackVault?.hint ?? null

  if (!encryptedLocation) return null

  const location = decryptLocationPayload(user.id, String(encryptedLocation)) as StoredLocationPayload

  const labelHint =
    typeof hint === 'string' && hint.length ? hint : typeof location.label === 'string' ? location.label : null

  return {
    latitude: location.latitude,
    longitude: location.longitude,
    labelHint,
  }
}
