/**
 * Large vault video uploads bypass Next/Vercel body limits by PUTting to Supabase signed URLs.
 */

export type VaultVideoDirectUploadOk = {
  ok: true
  content: unknown
  downloadUrl?: string
}

export type VaultVideoDirectUploadErr = {
  ok: false
  status: number
  error: string
}

export async function uploadVaultVideoDirect(
  contentId: string,
  file: File,
): Promise<VaultVideoDirectUploadOk | VaultVideoDirectUploadErr> {
  const prepareRes = await fetch(`/api/content/vault/${contentId}/frame-export/prepare`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name || 'export.mp4',
      mimeType: file.type || 'video/mp4',
      fileSize: file.size,
    }),
  })
  const pj = (await prepareRes.json().catch(() => ({}))) as Record<string, unknown>
  if (!prepareRes.ok) {
    return {
      ok: false,
      status: prepareRes.status,
      error: typeof pj.error === 'string' ? pj.error : 'Could not start upload',
    }
  }

  const signedUrl = pj.signedUrl
  const path = pj.path
  if (typeof signedUrl !== 'string' || typeof path !== 'string' || !signedUrl || !path) {
    return { ok: false, status: 500, error: 'Invalid prepare response' }
  }

  const mime = file.type || 'video/mp4'
  const putRes = await fetch(signedUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': mime },
  })
  if (!putRes.ok) {
    const t = await putRes.text().catch(() => '')
    return {
      ok: false,
      status: putRes.status,
      error: `Storage upload failed (${putRes.status}): ${t.slice(0, 240)}`,
    }
  }

  const completeRes = await fetch(`/api/content/vault/${contentId}/frame-export/complete`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, mimeType: mime }),
  })
  const cj = (await completeRes.json().catch(() => ({}))) as Record<string, unknown>
  if (!completeRes.ok) {
    return {
      ok: false,
      status: completeRes.status,
      error: typeof cj.error === 'string' ? cj.error : 'Could not finalize vault upload',
    }
  }

  return {
    ok: true,
    content: cj.content,
    downloadUrl: typeof cj.downloadUrl === 'string' ? cj.downloadUrl : undefined,
  }
}
