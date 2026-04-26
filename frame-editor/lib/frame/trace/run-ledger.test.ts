import { describe, expect, it } from 'vitest'
import { capRunLedger, parseStoredRunLedger, RUN_LEDGER_LIMIT } from './run-ledger'

describe('run ledger helpers', () => {
  it('caps ledgers to configured maximum while preserving front ordering', () => {
    const runs = Array.from({ length: RUN_LEDGER_LIMIT + 5 }, (_, index) => ({ id: `run-${index}` }))
    const capped = capRunLedger(runs)
    expect(capped).toHaveLength(RUN_LEDGER_LIMIT)
    expect(capped[0]?.id).toBe('run-0')
    expect(capped[RUN_LEDGER_LIMIT - 1]?.id).toBe(`run-${RUN_LEDGER_LIMIT - 1}`)
  })

  it('parses stored ledgers safely and returns empty arrays for invalid shapes', () => {
    expect(parseStoredRunLedger(null)).toEqual([])
    expect(parseStoredRunLedger(JSON.stringify({ bad: true }))).toEqual([])
    expect(parseStoredRunLedger(JSON.stringify([{ id: 'run-1' }, { id: 'run-2' }]))).toEqual([
      { id: 'run-1' },
      { id: 'run-2' },
    ])
  })
})
