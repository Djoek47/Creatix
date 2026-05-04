import { test, expect } from '@playwright/test'

test.describe('Fansly webhook (public)', () => {
  test('returns 403 when webhook is disabled (default)', async ({ request }) => {
    const res = await request.post('/api/fansly/webhook', {
      data: JSON.stringify({ event_type: 'new_message', data: {} }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(403)
    const body = await res.json().catch(() => ({}))
    expect(body).toMatchObject({ received: false })
  })
})
