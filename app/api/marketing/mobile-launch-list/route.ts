import { NextRequest, NextResponse } from 'next/server'
import { resolveNoreplyFrom } from '@/lib/email/resend-from'
import { logApiError } from '@/lib/usage/server-log'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

/**
 * Public waitlist — marketing home only. Not the member support channel.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const handle = typeof body.handle === 'string' ? body.handle.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 })
    }

    const apiKey = process.env.RESEND_API_KEY
    const toAddress =
      process.env.SUPPORT_CONTACT_EMAIL?.trim() || 'admin@circeetvenus.com'

    if (!apiKey) {
      return NextResponse.json(
        { error: 'This form is temporarily unavailable. Please try again later.' },
        { status: 500 },
      )
    }

    const payloadMessage = [
      'Mobile Launch List Signup',
      handle ? `Creator handle: ${handle}` : '',
      '',
      message || 'No extra notes provided.',
    ]
      .filter(Boolean)
      .join('\n')

    const text = [`From: ${name} <${email}>`, '', payloadMessage].join('\n')

    const resendRes = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resolveNoreplyFrom(),
        to: [toAddress],
        subject: `[Mobile launch list] ${name}`,
        reply_to: email,
        text,
      }),
    })

    if (!resendRes.ok) {
      const err = (await resendRes.json().catch(() => ({}))) as { message?: string }
      return NextResponse.json(
        {
          error:
            err?.message ||
            `Failed to send (status ${resendRes.status}). Please try again.`,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logApiError({
      userId: null,
      route: 'POST /api/marketing/mobile-launch-list',
      httpStatus: 500,
      message: error instanceof Error ? error.message : 'mobile-launch-list error',
      stack: error instanceof Error ? error.stack : null,
      safeContext: { handler: 'mobile-launch-list' },
    })
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 })
  }
}
