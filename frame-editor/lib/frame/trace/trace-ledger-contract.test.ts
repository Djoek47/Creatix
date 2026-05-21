import { describe, expect, it } from 'vitest'
import { buildTraceHistoryEntries } from './history'
import { parseStoredRunLedger } from './run-ledger'
import { filterRunsForRecipientFocus, getFirstRecipientMatchId, normalizeRecipientKey } from './triage'

describe('trace ledger contract', () => {
  it('keeps hydration, history projection, and recipient focus filtering consistent', () => {
    const stored = JSON.stringify([
      {
        id: 'run-1',
        at: '2026-01-01T00:00:00.000Z',
        recipientKey: ' FAN-ALPHA ',
        status: 'success',
        payloadId: 'payload-1',
        attempt: 1,
        encoderProfile: 'mp4-9:16-of',
        planHash: 'hash-a',
      },
      {
        id: 'run-2',
        at: '2026-01-01T00:01:00.000Z',
        recipientKey: 'fan-beta',
        status: 'error',
        attempt: 1,
        encoderProfile: 'mp4-9:16-of',
        planHash: 'hash-a',
      },
      {
        id: 'run-3',
        at: '2026-01-01T00:02:00.000Z',
        recipientKey: 'fan-alpha',
        status: 'success',
        payloadId: 'payload-3',
        attempt: 2,
        encoderProfile: 'mp4-9:16-of',
        planHash: 'hash-b',
      },
    ])

    const hydratedRuns = parseStoredRunLedger(stored)
    const history = buildTraceHistoryEntries(hydratedRuns)
    expect(history).toHaveLength(2)
    expect(history.map((item) => item.payloadId)).toEqual(['payload-1', 'payload-3'])

    const normalized = normalizeRecipientKey('fan-alpha')
    const focusedRuns = filterRunsForRecipientFocus(hydratedRuns, normalized, true)
    expect(focusedRuns.map((run) => run.id)).toEqual(['run-1', 'run-3'])
    expect(getFirstRecipientMatchId(focusedRuns, normalized)).toBe('run-1')
  })
})
