import type { SupabaseClient } from '@supabase/supabase-js'
import { VAULT_MEDIA_BUCKET } from '@/lib/frame-vault-media'
import { vaultObjectSizeBytes } from '@/lib/vault-storage-usage'

const SIGNED_URL_SECONDS = 60 * 24 * 60 * 60 // 60 days

export type FinalizeVaultExportResult =
  | {
      ok: true
      content: Record<string, unknown>
      downloadUrl: string
      signedUrlExpiresInSec: number
    }
  | { ok: false; status: number; error: string }

function sanitizeExportTitle(title: string | null | undefined): string | null {
  if (typeof title !== 'string') return null
  const trimmed = title.trim().replace(/\s+/g, ' ').slice(0, 500)
  return trimmed.length > 0 ? trimmed : null
}

/**
 * After a client uploads to `storagePath`, update `content` with a fresh signed `file_url`
 * and remove the previous vault object when replaced.
 */
export async function finalizeVaultExportUpload(
  service: SupabaseClient,
  opts: {
    userId: string
    contentId: string
    storagePath: string
    mime: string
    title?: string | null
  },
): Promise<FinalizeVaultExportResult> {
  const { userId, contentId, storagePath, mime } = opts

  const folder = `${userId}/${contentId}`
  if (!storagePath.startsWith(`${folder}/`)) {
    return { ok: false, status: 400, error: 'Invalid storage path for this vault item.' }
  }

  const fileName = storagePath.slice(folder.length + 1)
  const { data: listed, error: listErr } = await service.storage.from(VAULT_MEDIA_BUCKET).list(folder, {
    limit: 500,
  })
  if (listErr) {
    return { ok: false, status: 500, error: listErr.message || 'Could not verify upload.' }
  }
  const exists = (listed ?? []).some((f) => f.name === fileName)
  if (!exists) {
    return {
      ok: false,
      status: 400,
      error: 'Upload not found in storage. Retry the upload step or check your network.',
    }
  }

  const { data: row, error: fetchErr } = await service
    .from('content')
    .select('id,vault_storage_path')
    .eq('id', contentId)
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchErr || !row) {
    return { ok: false, status: 404, error: 'Not found' }
  }

  const currentPath = (row as { vault_storage_path?: string | null }).vault_storage_path ?? null

  const { data: signed, error: signErr } = await service.storage
    .from(VAULT_MEDIA_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_SECONDS)

  if (signErr || !signed?.signedUrl) {
    return { ok: false, status: 500, error: signErr?.message || 'Could not sign URL' }
  }

  const patch: Record<string, unknown> = {
    file_url: signed.signedUrl,
    vault_storage_path: storagePath,
    updated_at: new Date().toISOString(),
  }
  const exportTitle = sanitizeExportTitle(opts.title)
  if (exportTitle) {
    patch.title = exportTitle
  }

  const { data: updated, error: updErr } = await service
    .from('content')
    .update(patch)
    .eq('id', contentId)
    .eq('user_id', userId)
    .select('id, title, file_url, vault_storage_path, updated_at')
    .maybeSingle()

  if (updErr || !updated) {
    return { ok: false, status: 500, error: updErr?.message || 'Update failed' }
  }

  if (currentPath && currentPath !== storagePath) {
    void service.storage.from(VAULT_MEDIA_BUCKET).remove([currentPath])
  }

  return {
    ok: true,
    content: updated as Record<string, unknown>,
    downloadUrl: signed.signedUrl,
    signedUrlExpiresInSec: SIGNED_URL_SECONDS,
  }
}

/** Best-effort size of current vault object (for quota projection). */
export async function vaultExportExistingBytes(
  service: SupabaseClient,
  storagePath: string | null,
): Promise<number> {
  if (!storagePath) return 0
  return vaultObjectSizeBytes(service, storagePath)
}
