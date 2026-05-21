import { type NextRequest, NextResponse } from 'next/server'
import { applyMarkitCorsHeaders, markitCorsOptions } from '@/lib/cors-markit'
import { drainMarkitDivineActions } from '@/lib/divine/markit-divine-bridge'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function sseResponse(request: NextRequest, userId: string) {
  const encoder = new TextEncoder()
  let interval: ReturnType<typeof setInterval> | undefined

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: object) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }
      send('connected', { userId, t: Date.now() })
      interval = setInterval(() => {
        try {
          const actions = drainMarkitDivineActions(userId)
          for (const action of actions) {
            send('divine_action', { action })
          }
          send('heartbeat', { t: Date.now() })
        } catch {
          /* ignore */
        }
      }, 1000)
    },
    cancel() {
      if (interval) clearInterval(interval)
    },
  })

  const res = new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
  return applyMarkitCorsHeaders(request, res)
}

export function OPTIONS(request: NextRequest) {
  return markitCorsOptions(request)
}

/**
 * Server-Sent Events stream of Divine / Markit editor actions for the signed-in user.
 * Markit may connect via `fetch` streaming with `Authorization: Bearer` (not EventSource headers).
 */
export async function GET(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return applyMarkitCorsHeaders(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
  }
  return sseResponse(request, user.id)
}
