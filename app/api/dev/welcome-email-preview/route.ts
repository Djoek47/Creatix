import { NextResponse } from 'next/server'
import { buildWelcomeEmailContent } from '@/lib/email/welcome-email-templates'

/**
 * Local preview of the welcome HTML (light/dark follows OS / browser).
 * Enable: `NODE_ENV=development` and `WELCOME_EMAIL_PREVIEW=1` in `.env.local`.
 * Open: http://localhost:3000/api/dev/welcome-email-preview?name=YourName
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (process.env.WELCOME_EMAIL_PREVIEW !== '1') {
    return NextResponse.json(
      { error: 'Set WELCOME_EMAIL_PREVIEW=1 in .env.local to enable this route.' },
      { status: 404 },
    )
  }

  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')?.trim() || 'Alex'

  const { html } = buildWelcomeEmailContent({ greetingName: name })

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
