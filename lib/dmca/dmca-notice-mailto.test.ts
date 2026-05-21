/**
 * Run: npx tsx lib/dmca/dmca-notice-mailto.test.ts
 */
import assert from 'node:assert/strict'
import { buildDmcaNoticeMailtoHref } from '@/lib/dmca/dmca-notice-mailto'

function run() {
  const small = buildDmcaNoticeMailtoHref({ to: 'abuse@example.com', body: 'Hello\nNotice' })
  assert.ok(small.startsWith('mailto:abuse@example.com?'))
  assert.ok(decodeURIComponent(small).includes('Hello'))

  const nosTo = buildDmcaNoticeMailtoHref({ body: 'No recipient' })
  assert.ok(nosTo.startsWith('mailto:?'))

  const blob = buildDmcaNoticeMailtoHref({ body: `x`.repeat(200_000) })
  assert.ok(blob.length <= 2000)

  console.log('dmca-notice-mailto tests passed')
}

run()
