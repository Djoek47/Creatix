import type { NextRequest } from 'next/server'
import { verifyExportToken } from '@/lib/frame-vault-bridge'

/**
 * Resolve user id for vault export flows: Frame service (secret + exportToken) or session cookie.
 */
export function resolveVaultExportUserId(
  request: NextRequest,
  contentId: string,
  body: { exportToken?: string | null },
  sessionUserId: string | null,
): string | null {
  const serviceSecret = process.env.FRAME_EXPORT_SECRET
  const headerSecret = request.headers.get('x-frame-export-secret')
  const exportToken = typeof body.exportToken === 'string' ? body.exportToken : null

  if (serviceSecret && headerSecret === serviceSecret && exportToken) {
    const payload = verifyExportToken(exportToken)
    if (!payload || payload.contentId !== contentId) return null
    return payload.userId
  }

  return sessionUserId
}
