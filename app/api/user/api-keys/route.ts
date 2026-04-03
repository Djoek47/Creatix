import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createHmac, randomBytes } from 'crypto'

const PREFIX = 'cev_live_sk_'
const KEY_BYTES = 32

/** Server-only signing material. Never use the public anon key for HMAC. Optional dedicated secret for rotation without changing Supabase keys. */
function getHmacSecret(): string | null {
  return process.env.USER_API_KEY_HMAC_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null
}

function hashKey(secret: string): string {
  const key = getHmacSecret()
  if (!key) {
    throw new Error('USER_API_KEY_HMAC_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set for API key hashing')
  }
  return createHmac('sha256', key).update(secret).digest('hex')
}

function generateKey(): { fullKey: string; prefix: string; hash: string } {
  const secret = randomBytes(KEY_BYTES).toString('base64url')
  const fullKey = PREFIX + secret
  const prefix = PREFIX + secret.slice(0, 8) + '…'
  const hash = hashKey(fullKey)
  return { fullKey, prefix, hash }
}

export async function GET(request: NextRequest) {
  if (!getHmacSecret()) {
    return NextResponse.json(
      { error: 'Server misconfigured: set USER_API_KEY_HMAC_SECRET or SUPABASE_SERVICE_ROLE_KEY for API keys.' },
      { status: 503 },
    )
  }
  const supabase = await createRouteHandlerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_api_keys')
    .select('id, key_prefix, name, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ keys: data || [] })
}

export async function POST(req: NextRequest) {
  if (!getHmacSecret()) {
    return NextResponse.json(
      { error: 'Server misconfigured: set USER_API_KEY_HMAC_SECRET or SUPABASE_SERVICE_ROLE_KEY for API keys.' },
      { status: 503 },
    )
  }
  const supabase = await createRouteHandlerClient(req)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() || null : null

  let fullKey: string
  let prefix: string
  let hash: string
  try {
    ;({ fullKey, prefix, hash } = generateKey())
  } catch {
    return NextResponse.json({ error: 'API key signing unavailable' }, { status: 503 })
  }

  const { data: row, error } = await supabase
    .from('user_api_keys')
    .insert({ user_id: user.id, key_prefix: prefix, key_hash: hash, name })
    .select('id, key_prefix, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    id: row.id,
    key: fullKey,
    key_prefix: row.key_prefix,
    created_at: row.created_at,
    message: 'Copy this key now. It will not be shown again.',
  })
}
