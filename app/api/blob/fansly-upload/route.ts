import { NextRequest, NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

export const runtime = 'nodejs'

/** Max single upload (Vercel Blob); ApiFansly has separate limits. */
const MAX_BYTES = 500 * 1024 * 1024

const ALLOWED: string[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'application/octet-stream',
]

/**
 * Client-upload token for @vercel/blob `upload()` — avoids POSTing large file bytes through
 * `/api/fansly/media/upload` (Vercel serverless body limit ~4.5MB → 413).
 *
 * Requires `BLOB_READ_WRITE_TOKEN` on Vercel (Storage → Blob).
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HandleUploadBody

    let userIdForPayload: string | null = null
    if (body.type === 'blob.generate-client-token') {
      const supabase = await createRouteHandlerClient(request)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userIdForPayload = user.id
    }

    const jsonResponse = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ALLOWED,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: userIdForPayload ? JSON.stringify({ userId: userIdForPayload }) : null,
        }
      },
      onUploadCompleted: async () => {
        // Fansly handoff happens in POST /api/fansly/media/upload with file_url.
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Blob upload failed'
    console.error('[blob/fansly-upload]', err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
