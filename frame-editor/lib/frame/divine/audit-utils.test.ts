import { describe, expect, it } from 'vitest'
import { filterAndSortAuditEntries, type DivineAuditEntry } from './audit-utils'

const BASE_NOW = Date.parse('2026-04-26T04:40:00.000Z')

function makeEntry(input: Partial<DivineAuditEntry> & Pick<DivineAuditEntry, 'at' | 'mode'>): DivineAuditEntry {
  return {
    at: input.at,
    mode: input.mode,
    actionCount: input.actionCount ?? 1,
    okCount: input.okCount ?? 1,
    failCount: input.failCount ?? 0,
    source: input.source ?? 'divine-voice',
    nonce: input.nonce ?? 'n/a',
    summary: input.summary ?? 'ok',
    envelopeIssuedAt: input.envelopeIssuedAt,
  }
}

describe('filterAndSortAuditEntries', () => {
  const entries: DivineAuditEntry[] = [
    makeEntry({ at: '2026-04-26T04:39:30.000Z', mode: 'apply', failCount: 2, source: 'voice', nonce: 'n1', summary: 'clip missing' }),
    makeEntry({ at: '2026-04-26T04:10:00.000Z', mode: 'preview', failCount: 0, source: 'voice', nonce: 'n2', summary: 'all actions passed' }),
    makeEntry({ at: '2026-04-25T03:10:00.000Z', mode: 'apply', failCount: 1, source: 'manual', nonce: 'n3', summary: 'bad format' }),
  ]

  it('filters by mode and failures', () => {
    const result = filterAndSortAuditEntries(
      entries,
      { mode: 'apply', failuresOnly: true, search: '', sort: 'newest', timeRange: 'all' },
      BASE_NOW,
    )
    expect(result).toHaveLength(2)
    expect(result.every((entry) => entry.mode === 'apply')).toBe(true)
    expect(result.every((entry) => entry.failCount > 0)).toBe(true)
  })

  it('filters by search across source/nonce/summary', () => {
    const bySource = filterAndSortAuditEntries(
      entries,
      { mode: 'all', failuresOnly: false, search: 'manual', sort: 'newest', timeRange: 'all' },
      BASE_NOW,
    )
    expect(bySource).toHaveLength(1)
    expect(bySource[0]?.nonce).toBe('n3')

    const byNonce = filterAndSortAuditEntries(
      entries,
      { mode: 'all', failuresOnly: false, search: 'n2', sort: 'newest', timeRange: 'all' },
      BASE_NOW,
    )
    expect(byNonce).toHaveLength(1)
    expect(byNonce[0]?.mode).toBe('preview')
  })

  it('applies time range filtering', () => {
    const result = filterAndSortAuditEntries(
      entries,
      { mode: 'all', failuresOnly: false, search: '', sort: 'newest', timeRange: '15m' },
      BASE_NOW,
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.nonce).toBe('n1')
  })

  it('sorts by failures then newest', () => {
    const result = filterAndSortAuditEntries(
      entries,
      { mode: 'all', failuresOnly: false, search: '', sort: 'failures', timeRange: 'all' },
      BASE_NOW,
    )
    expect(result[0]?.nonce).toBe('n1')
    expect(result[1]?.nonce).toBe('n3')
  })

  it('sorts oldest first', () => {
    const result = filterAndSortAuditEntries(
      entries,
      { mode: 'all', failuresOnly: false, search: '', sort: 'oldest', timeRange: 'all' },
      BASE_NOW,
    )
    expect(result[0]?.nonce).toBe('n3')
    expect(result[result.length - 1]?.nonce).toBe('n1')
  })
})
