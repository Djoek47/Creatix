import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Optional rate limit before Supabase password sign-in for /admin/login.
 * Counts attempts per hashed IP in a 15-minute window (see admin_login_attempts).
 */
export async function POST(req: NextRequest) {
  try {
    const salt = process.env.ADMIN_LOGIN_RATE_SALT || 'creatix-admin-login'
    const forwarded = req.headers.get('x-forwarded-for')
    const ip =
      forwarded?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      req.headers.get('cf-connecting-ip') ||
      'unknown'
    const ipHash = createHash('sha256').update(`${salt}:${ip}`).digest('hex')

    const supabase = createServiceRoleClient()
    const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('admin_login_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', windowStart)

    const max = Math.max(1, Number.parseInt(process.env.ADMIN_LOGIN_MAX_ATTEMPTS_PER_15M || '40', 10) || 40)
    if ((count ?? 0) >= max) {
      return NextResponse.json(
        { ok: false, error: 'Too many sign-in attempts from this network. Try again later.' },
        { status: 429 },
      )
    }

    await supabase.from('admin_login_attempts').insert({ ip_hash: ipHash, outcome: 'attempt' })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.warn('[admin login-precheck]', e instanceof Error ? e.message : e)
    return NextResponse.json({ ok: true })
  }
}
