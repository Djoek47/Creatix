import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Proxies Frame Assist to Creatix so the browser never sends a Supabase JWT to circeetvenus.com
 * directly (avoids CORS). Manual export stays on this app and does not hit this route.
 */
export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const creatix = (process.env.NEXT_PUBLIC_CREATIX_APP_URL || 'https://www.circeetvenus.com').replace(
    /\/$/,
    '',
  )

  if (!url || !anon) {
    return NextResponse.json({ error: 'Supabase not configured on Frame deployment' }, { status: 503 })
  }

  let body: { messages?: unknown; vaultExportToken?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const messages = body.messages
  const vaultExportToken = typeof body.vaultExportToken === 'string' ? body.vaultExportToken.trim() : ''

  let authorization: string | null = null
  if (vaultExportToken) {
    authorization = `Bearer ${vaultExportToken}`
  } else {
    const cookieStore = await cookies()
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          /* no-op */
        },
      },
    })
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session?.access_token) {
      authorization = `Bearer ${session.access_token}`
    }
  }

  if (!authorization) {
    return NextResponse.json({ error: 'Sign in or open this editor from the vault (bridge link).' }, { status: 401 })
  }

  const upstream = await fetch(`${creatix}/api/frame/ai/assist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body: JSON.stringify({ messages }),
  })

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => '')
    try {
      const j = JSON.parse(errText) as Record<string, unknown>
      return NextResponse.json(j, { status: upstream.status })
    } catch {
      return NextResponse.json(
        { error: formatUpstreamFailure(upstream.status, errText, creatix) },
        { status: upstream.status },
      )
    }
  }

  if (!upstream.body) {
    return NextResponse.json({ error: 'Empty response' }, { status: 502 })
  }

  const raw = await upstream.text()
  const text = extractDataStreamText(raw)
  return NextResponse.json({ text, rawStream: process.env.NODE_ENV === 'development' ? raw : undefined })
}

/**
 * Creatix returns JSON errors for API routes. If production is missing
 * `/api/frame/ai/assist`, Next serves an HTML 404 — avoid dumping that into the UI.
 */
function formatUpstreamFailure(status: number, body: string, creatixBase: string): string {
  const t = body.trim()
  const looksLikeHtml =
    t.startsWith('<!DOCTYPE') || t.startsWith('<html') || /<\/html>/i.test(t)
  if (looksLikeHtml || status === 404) {
    return (
      `Creatix did not return Frame Assist (${status}). ` +
      `Deploy a build that includes /api/frame/ai/assist on ${creatixBase} ` +
      `(merge from the frame branch), or fix NEXT_PUBLIC_CREATIX_APP_URL on this Frame project.`
    )
  }
  if (t.length > 600) {
    return `${t.slice(0, 280)}…`
  }
  return t || `Upstream error (${status})`
}

/**
 * Creatix `streamText` + `toUIMessageStreamResponse()` emits SSE `data:` lines with
 * `{ "type": "text-delta", "delta": "..." }`. Older streams used lines prefixed with `0:`.
 */
function extractDataStreamText(raw: string): string {
  const parts: string[] = []
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t) continue

    if (t.startsWith('0:')) {
      try {
        const j = JSON.parse(t.slice(2)) as unknown
        if (typeof j === 'string') parts.push(j)
      } catch {
        /* ignore */
      }
      continue
    }

    if (t.startsWith('data:')) {
      const payload = t.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const j = JSON.parse(payload) as {
          type?: string
          delta?: string
          text?: string
        }
        if (j.type === 'text-delta' && typeof j.delta === 'string') {
          parts.push(j.delta)
        }
      } catch {
        /* ignore */
      }
    }
  }
  if (parts.length > 0) return parts.join('')
  return raw.trim()
}
