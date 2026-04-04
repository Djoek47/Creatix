import { createHmac, randomUUID } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'

export type UsageWebhookPayload = {
  type: 'ai.usage'
  event_id: string
  created_at: string
  user_id: string
  feature: string
  provider: string
  model: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  estimated_usd: number
  request_id: string | null
  success: boolean
}

function signBody(secret: string, rawBody: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex')
}

/**
 * Fire-and-forget: POST JSON to the user's configured URL with optional HMAC signature.
 */
export function dispatchUserUsageWebhook(payload: UsageWebhookPayload): void {
  const run = async () => {
    let url: string | null = null
    let secret: string | null = null
    try {
      const supabase = createServiceRoleClient()
      const { data } = await supabase
        .from('user_usage_webhook_endpoints')
        .select('url, secret, enabled')
        .eq('user_id', payload.user_id)
        .maybeSingle()
      const row = data as { url?: string; secret?: string | null; enabled?: boolean } | null
      if (!row?.enabled || !row.url?.trim()) return
      url = row.url.trim()
      secret = row.secret?.trim() ? row.secret.trim() : null
    } catch {
      return
    }

    const rawBody = JSON.stringify(payload)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Creatix-UsageWebhook/1',
      'X-Creatix-Event': payload.type,
      'X-Creatix-Delivery': randomUUID(),
    }
    if (secret) {
      headers['X-Creatix-Signature'] = `sha256=${signBody(secret, rawBody)}`
    }

    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), 8000)
    try {
      await fetch(url, { method: 'POST', headers, body: rawBody, signal: ac.signal })
    } catch (e) {
      console.warn('[dispatchUserUsageWebhook]', e instanceof Error ? e.message : e)
    } finally {
      clearTimeout(t)
    }
  }
  void run()
}
