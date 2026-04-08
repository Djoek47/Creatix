/**
 * Run: pnpm run test:dmca-host
 */
import assert from 'node:assert/strict'
import { getHostReportDestinations } from '@/lib/dmca/host-report-destinations'

function run() {
  const reddit = getHostReportDestinations('https://www.reddit.com/r/foo/comments/abc', null)
  assert.ok(reddit.links.some((l) => l.kind === 'url' && l.source === 'curated'))
  assert.ok(reddit.links.some((l) => l.href.includes('reddithelp')))

  const unknown = getHostReportDestinations('https://unknown-example-xyz.test/page', null)
  assert.equal(unknown.links.length, 0)
  assert.equal(unknown.hintText, null)

  const notesUrl = JSON.stringify({
    grok: {
      contactHint: 'Use their form at https://example.com/dmca for takedowns',
    },
  })
  const hinted = getHostReportDestinations('https://foo.com/x', notesUrl)
  assert.ok(hinted.links.some((l) => l.source === 'hint_url' && l.href.includes('example.com/dmca')))
  assert.ok(hinted.hintText != null && hinted.hintText.includes('Use their form'))

  const notesEmail = JSON.stringify({
    grok: {
      contactHint: 'Write to abuse@example.com only',
    },
  })
  const mail = getHostReportDestinations('https://no-map-host.test/', notesEmail)
  assert.ok(mail.links.some((l) => l.kind === 'mailto' && l.href.startsWith('mailto:abuse@example.com')))

  const structured = JSON.stringify({
    grok: {
      contactUrl: 'https://report.example.net/ip',
      contactEmail: 'legal@example.net',
    },
  })
  const g = getHostReportDestinations('https://z.com/', structured)
  assert.ok(g.links[0]?.source === 'grok_url')
  assert.ok(g.links.some((l) => l.source === 'grok_email'))

  console.log('host-report-destinations.test.ts: all assertions passed')
}

run()
