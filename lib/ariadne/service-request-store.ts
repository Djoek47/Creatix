import { createServiceRoleClient } from '@/lib/supabase/server'
import { serviceReplayWindowSec } from '@/lib/ariadne/service-auth'

export async function registerServiceNonce(input: {
  serviceName: string
  nonce: string
  requestPath: string
  idempotencyKey: string
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const supabase = createServiceRoleClient()
  const expiresAt = new Date(Date.now() + serviceReplayWindowSec() * 1000).toISOString()
  const { error } = await supabase.from('ariadne_service_nonces').insert({
    service_name: input.serviceName,
    nonce: input.nonce,
    request_path: input.requestPath,
    idempotency_key: input.idempotencyKey,
    expires_at: expiresAt,
  })

  if (!error) return { ok: true }
  if (error.code === '23505') {
    return { ok: false, status: 409, error: 'Replay nonce detected' }
  }
  return { ok: false, status: 500, error: error.message || 'Could not persist service nonce' }
}

export async function getIdempotencyResult(input: {
  endpoint: string
  idempotencyKey: string
  serviceName: string
}) {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('ariadne_idempotency_keys')
    .select('status_code, response_body')
    .eq('endpoint', input.endpoint)
    .eq('idempotency_key', input.idempotencyKey)
    .eq('service_name', input.serviceName)
    .maybeSingle()
  if (error || !data) return null
  return data
}

export async function storeIdempotencyResult(input: {
  endpoint: string
  idempotencyKey: string
  serviceName: string
  userId: string | null
  statusCode: number
  responseBody: unknown
}) {
  const supabase = createServiceRoleClient()
  await supabase.from('ariadne_idempotency_keys').insert({
    user_id: input.userId,
    endpoint: input.endpoint,
    idempotency_key: input.idempotencyKey,
    service_name: input.serviceName,
    status_code: input.statusCode,
    response_body: (input.responseBody ?? {}) as Record<string, unknown>,
  })
}

