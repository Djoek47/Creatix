import { describe, expect, it } from 'vitest'
import {
  filterRunsForRecipientFocus,
  getFirstRecipientMatchId,
  hasRecipientMatch,
  isRecipientFocused,
  normalizeRecipientKey,
} from './triage'

describe('trace triage helpers', () => {
  it('normalizes recipient keys for case and whitespace', () => {
    expect(normalizeRecipientKey('  Fan-Alpha  ')).toBe('fan-alpha')
  })

  it('checks whether a run belongs to focused recipient', () => {
    expect(isRecipientFocused(' Fan-Alpha ', 'fan-alpha')).toBe(true)
    expect(isRecipientFocused('fan-beta', 'fan-alpha')).toBe(false)
    expect(isRecipientFocused('fan-alpha', '')).toBe(false)
  })

  it('filters runs by focused recipient only when enabled', () => {
    const runs = [
      { id: 'run-1', recipientKey: 'fan-alpha' },
      { id: 'run-2', recipientKey: 'fan-beta' },
      { id: 'run-3', recipientKey: ' FAN-ALPHA ' },
    ]

    expect(filterRunsForRecipientFocus(runs, 'fan-alpha', false)).toEqual(runs)
    expect(filterRunsForRecipientFocus(runs, 'fan-alpha', true).map((run) => run.id)).toEqual(['run-1', 'run-3'])
  })

  it('detects recipient matches and resolves first match id deterministically', () => {
    const runs = [
      { id: 'trace-1', recipientKey: 'fan-zeta' },
      { id: 'trace-2', recipientKey: ' fan-alpha ' },
      { id: 'trace-3', recipientKey: 'fan-alpha' },
    ]

    expect(hasRecipientMatch(runs, 'fan-alpha')).toBe(true)
    expect(hasRecipientMatch(runs, 'fan-missing')).toBe(false)
    expect(getFirstRecipientMatchId(runs, 'fan-alpha')).toBe('trace-2')
    expect(getFirstRecipientMatchId(runs, 'fan-missing')).toBeNull()
  })
})
