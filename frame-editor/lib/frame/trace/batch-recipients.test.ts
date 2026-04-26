import { describe, expect, it } from 'vitest'
import {
  normalizeTraceBatchRecipientList,
  normalizeTraceBatchRecipients,
  TRACE_BATCH_RECIPIENT_LIMIT,
} from './batch-recipients'

describe('normalizeTraceBatchRecipients', () => {
  it('trims, removes blanks, and de-duplicates preserving first-seen order', () => {
    const normalized = normalizeTraceBatchRecipients(' fan-a \n\nfan-b\nfan-a\nfan-c\n')
    expect(normalized).toEqual(['fan-a', 'fan-b', 'fan-c'])
  })

  it('caps results to the configured recipient limit', () => {
    const raw = Array.from({ length: TRACE_BATCH_RECIPIENT_LIMIT + 25 }, (_, index) => `fan-${index}`).join('\n')
    const normalized = normalizeTraceBatchRecipients(raw)
    expect(normalized).toHaveLength(TRACE_BATCH_RECIPIENT_LIMIT)
    expect(normalized[0]).toBe('fan-0')
    expect(normalized[TRACE_BATCH_RECIPIENT_LIMIT - 1]).toBe(`fan-${TRACE_BATCH_RECIPIENT_LIMIT - 1}`)
  })

  it('de-duplicates before capping so later unique recipients are preserved', () => {
    const list = [
      ...Array.from({ length: 60 }, () => 'fan-dup'),
      ...Array.from({ length: 60 }, (_, index) => `fan-${index}`),
    ]
    const normalized = normalizeTraceBatchRecipientList(list)
    expect(normalized).toHaveLength(TRACE_BATCH_RECIPIENT_LIMIT)
    expect(normalized[0]).toBe('fan-dup')
    expect(normalized[1]).toBe('fan-0')
    expect(normalized[TRACE_BATCH_RECIPIENT_LIMIT - 1]).toBe(`fan-${TRACE_BATCH_RECIPIENT_LIMIT - 2}`)
  })
})
