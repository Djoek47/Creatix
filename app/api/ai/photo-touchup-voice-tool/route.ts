import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { executePhotoEditIntent } from '@/lib/media/photo-edit-intent-core'

export const maxDuration = 120

/**
 * Realtime voice tool target for Safe Photo Touch-up (same contract as /api/divine/voice-tool).
 * POST body: { name, arguments?, imageBase64? } — imageBase64 is merged by the client from the open photo.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as {
      name?: string
      arguments?: Record<string, unknown>
      imageBase64?: string
    }
    const name = typeof body.name === 'string' ? body.name : ''
    const args = body.arguments && typeof body.arguments === 'object' ? body.arguments : {}
    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64.trim() : ''

    if (name === 'end_call') {
      return NextResponse.json({ content: 'Session ended.' })
    }

    if (name === 'voice_allow_user_hangup') {
      return NextResponse.json({
        content: 'You can end the call when ready.',
        ui_actions: [{ type: 'voice_set_hangup', allowed: true } as const],
      })
    }

    if (name === 'photo_apply_edit') {
      const instruction =
        typeof (args as { instruction?: unknown }).instruction === 'string'
          ? (args as { instruction: string }).instruction.trim()
          : ''
      if (!instruction) {
        return NextResponse.json({
          content:
            'No edit instruction was provided. Ask the creator what they want: blur for privacy, brighter, or an emoji placement.',
        })
      }
      if (!imageBase64.startsWith('data:image/')) {
        return NextResponse.json({
          content:
            'No photo is loaded in the app. Ask them to upload a photo in Safe photo touch-up and start the voice session again.',
        })
      }

      const result = await executePhotoEditIntent({
        imageBase64,
        instruction,
        userId: user.id,
        supabase,
      })

      if (!result.ok) {
        return NextResponse.json({
          content: `The edit could not be applied: ${result.error}. Suggest they try again or type the request.`,
        })
      }

      const { imageBase64: outUrl, operation, explanation, creditsUsed } = result.data
      return NextResponse.json({
        content: `${explanation} (${operation}). The updated image is shown in the editor.`,
        photo_touchup: {
          imageBase64: outUrl,
          operation,
          explanation,
          creditsUsed,
        },
      })
    }

    return NextResponse.json({
      content: `Unknown tool ${name}. Use photo_apply_edit with an instruction, or end_call.`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Photo touch-up voice tool failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
