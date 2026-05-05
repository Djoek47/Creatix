import { NextRequest, NextResponse } from 'next/server'
import { canUseCreditGatedProFeature } from '@/lib/billing/access'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { resolveResendFrom } from '@/lib/email/resend-from'
import { logApiError } from '@/lib/usage/server-log'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

const TOPIC_LABEL: Record<string, string> = {
  general: 'General',
  billing: 'Billing',
  technical: 'Technical',
  other: 'Other',
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.id) {
      return NextResponse.json({ error: 'Sign in required.', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan_id, status, trial_ends_at, current_period_end, stripe_subscription_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!canUseCreditGatedProFeature(sub)) {
      return NextResponse.json(
        {
          error: 'Support is available to active subscribers and trial members.',
          code: 'SUPPORT_MEMBER_ONLY',
        },
        { status: 403 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const topicRaw = typeof body.topic === 'string' ? body.topic.trim().toLowerCase() : ''
    const topic = ['general', 'billing', 'technical', 'other'].includes(topicRaw) ? topicRaw : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''

    if (!message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
    }

    const maxLen = 12_000
    if (message.length > maxLen) {
      return NextResponse.json({ error: `Message must be at most ${maxLen} characters.` }, { status: 400 })
    }

    const replyEmail = user.email?.trim()
    if (!replyEmail) {
      return NextResponse.json(
        { error: 'Your account has no email on file. Add one in Settings, then try again.' },
        { status: 400 },
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle()

    const metaName =
      typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === 'string'
          ? user.user_metadata.name
          : ''
    const displayName =
      (typeof profile?.full_name === 'string' && profile.full_name.trim()) ||
      metaName.trim() ||
      'Member'

    const apiKey = process.env.RESEND_API_KEY
    const toAddress =
      process.env.SUPPORT_CONTACT_EMAIL?.trim() || 'admin@circeetvenus.com'

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Contact is not configured (missing RESEND_API_KEY). Please try again later or email support directly.',
        },
        { status: 500 },
      )
    }

    const topicLabel = topic ? TOPIC_LABEL[topic] ?? topic : 'General'
    const emailSubject = `[Member support] ${topicLabel} — ${displayName}`

    const text = [
      `User id: ${user.id}`,
      `Name: ${displayName}`,
      `Reply-To: ${replyEmail}`,
      topic ? `Topic: ${topicLabel}` : '',
      '',
      message,
    ]
      .filter(Boolean)
      .join('\n')

    const html = `<pre style="font-family:ui-monospace,monospace;font-size:13px;line-height:1.5;white-space:pre-wrap;">${escapeHtml(text)}</pre>`

    const resendRes = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resolveResendFrom(),
        to: [toAddress],
        subject: emailSubject,
        reply_to: replyEmail,
        text,
        html,
      }),
    })

    if (!resendRes.ok) {
      const err = (await resendRes.json().catch(() => ({}))) as { message?: string }
      return NextResponse.json(
        {
          error:
            err?.message ||
            `Failed to send message (status ${resendRes.status}). Please try again.`,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logApiError({
      userId: null,
      route: 'POST /api/contact',
      httpStatus: 500,
      message: error instanceof Error ? error.message : 'contact route error',
      stack: error instanceof Error ? error.stack : null,
      safeContext: { handler: 'contact' },
    })
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unexpected error while sending message.',
      },
      { status: 500 },
    )
  }
}
