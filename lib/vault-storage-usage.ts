import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { VAULT_MEDIA_BUCKET } from '@/lib/frame-vault-media'

function metadataSize(metadata: unknown): number {
  if (!metadata || typeof metadata !== 'object') return 0
  const raw = (metadata as { size?: unknown }).size
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Size from a Storage list entry (metadata.size and/or top-level size — varies by API version). */
function vaultListedObjectSizeBytes(obj: unknown): number {
  if (!obj || typeof obj !== 'object') return 0
  const o = obj as { metadata?: unknown; size?: unknown }
  const fromMeta = metadataSize(o.metadata)
  if (fromMeta > 0) return fromMeta
  const raw = o.size
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 0
}

const MAX_PAGES = 10_000

/**
 * Sum file sizes for objects under `{userId}/…` via Storage API list-v2 (flat prefix).
 * Does not use PostgREST `storage.objects` — avoids "Invalid schema: storage" when that schema is not exposed to the REST API (common hosted default).
 */
export async function sumVaultMediaUsageBytes(
  service: SupabaseClient,
  userId: string
): Promise<{ bytes: number; error: string | null }> {
  const prefix = `${userId}/`
  let total = 0
  let cursor: string | undefined

  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await service.storage.from(VAULT_MEDIA_BUCKET).listV2({
      prefix,
      limit: 1000,
      cursor,
    })

    if (error) {
      return { bytes: 0, error: error.message ?? 'storage list failed' }
    }

    if (!data) break

    for (const obj of data.objects ?? []) {
      total += vaultListedObjectSizeBytes(obj as unknown)
    }

    if (!data.hasNext || !data.nextCursor) break
    cursor = data.nextCursor
  }

  return { bytes: total, error: null }
}

/**
 * Size (bytes) of one object path in vault-media via list-v2 under its parent prefix.
 */
export async function vaultObjectSizeBytes(service: SupabaseClient, vaultPath: string): Promise<number> {
  const trimmed = vaultPath.replace(/^\/+/, '')
  const lastSlash = trimmed.lastIndexOf('/')
  if (lastSlash < 0) return 0

  const dirPrefix = trimmed.slice(0, lastSlash + 1)
  const basename = trimmed.slice(lastSlash + 1)
  let cursor: string | undefined

  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await service.storage.from(VAULT_MEDIA_BUCKET).listV2({
      prefix: dirPrefix,
      limit: 1000,
      cursor,
    })
    if (error || !data) return 0

    for (const obj of data.objects ?? []) {
      const key = (obj.key ?? `${dirPrefix}${obj.name}`).replace(/^\/+/, '')
      if (obj.name === basename || key === trimmed) {
        return vaultListedObjectSizeBytes(obj as unknown)
      }
    }

    if (!data.hasNext || !data.nextCursor) break
    cursor = data.nextCursor
  }

  return 0
}
