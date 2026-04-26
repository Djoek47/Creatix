import { describe, expect, it } from 'vitest'
import { buildTraceHistoryEntries } from './history'

describe('buildTraceHistoryEntries', () => {
  it('returns only successful runs with payload ids', () => {
    const history = buildTraceHistoryEntries([
      {
        id: 'run-1',
        at: '2026-01-01T00:00:00.000Z',
        recipientKey: 'fan-a',
        status: 'success',
        payloadId: 'payload-1',
        attempt: 1,
        encoderProfile: 'mp4-9:16-of',
        planHash: 'abc123',
      },
      {
        id: 'run-2',
        at: '2026-01-01T00:01:00.000Z',
        recipientKey: 'fan-b',
        status: 'error',
        error: 'boom',
        attempt: 1,
        encoderProfile: 'mp4-9:16-of',
        planHash: 'abc123',
      },
      {
        id: 'run-3',
        at: '2026-01-01T00:02:00.000Z',
        recipientKey: 'fan-c',
        status: 'success',
        attempt: 1,
        encoderProfile: 'mp4-9:16-of',
        planHash: 'abc123',
      },
    ])

    expect(history).toEqual([
      {
        at: '2026-01-01T00:00:00.000Z',
        recipientKey: 'fan-a',
        payloadId: 'payload-1',
        encoderProfile: 'mp4-9:16-of',
        planHash: 'abc123',
      },
    ])
  })
})
