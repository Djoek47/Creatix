import { describe, expect, it } from 'vitest'
import {
  appendAuditEntry,
  clearAuditEntries,
  DIVINE_AUDIT_LOG_KEY,
  DIVINE_NONCE_LOG_KEY,
  loadAuditEntries,
  nonceAlreadyUsed,
  pruneAuditEntries,
  rememberNonce,
} from './audit-storage'
import type { DivineAuditEntry } from './audit-utils'

function createMemoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null
    },
    setItem(key: string, value: string) {
      map.set(key, value)
    },
    removeItem(key: string) {
      map.delete(key)
    },
  }
}

function sampleEntry(at: string, nonce: string): DivineAuditEntry {
  return {
    at,
    mode: 'apply',
    actionCount: 1,
    okCount: 1,
    failCount: 0,
    source: 'divine-voice',
    nonce,
    summary: 'all actions passed',
  }
}

describe('audit-storage helpers', () => {
  it('loads empty array when storage has no entries', () => {
    const storage = createMemoryStorage()
    expect(loadAuditEntries(storage)).toEqual([])
  })

  it('appends entries and persists them', () => {
    const storage = createMemoryStorage()
    const current = loadAuditEntries(storage)
    const next = appendAuditEntry(current, sampleEntry('2026-04-26T04:00:00.000Z', 'n1'), storage)
    expect(next).toHaveLength(1)
    const persistedRaw = storage.getItem(DIVINE_AUDIT_LOG_KEY)
    expect(persistedRaw).toBeTruthy()
    expect(loadAuditEntries(storage)).toHaveLength(1)
  })

  it('prunes entries to requested limit', () => {
    const storage = createMemoryStorage()
    const all = [
      sampleEntry('2026-04-26T04:02:00.000Z', 'n2'),
      sampleEntry('2026-04-26T04:01:00.000Z', 'n1'),
      sampleEntry('2026-04-26T04:00:00.000Z', 'n0'),
    ]
    storage.setItem(DIVINE_AUDIT_LOG_KEY, JSON.stringify(all))
    const pruned = pruneAuditEntries(all, 2, storage)
    expect(pruned).toHaveLength(2)
    expect(loadAuditEntries(storage)).toHaveLength(2)
  })

  it('clears persisted audit entries', () => {
    const storage = createMemoryStorage()
    storage.setItem(DIVINE_AUDIT_LOG_KEY, JSON.stringify([sampleEntry('2026-04-26T04:00:00.000Z', 'n1')]))
    clearAuditEntries(storage)
    expect(loadAuditEntries(storage)).toEqual([])
  })

  it('tracks and deduplicates used nonces', () => {
    const storage = createMemoryStorage()
    expect(nonceAlreadyUsed('nonce-1', storage)).toBe(false)
    rememberNonce('nonce-1', storage)
    expect(nonceAlreadyUsed('nonce-1', storage)).toBe(true)
    rememberNonce('nonce-1', storage)
    const raw = storage.getItem(DIVINE_NONCE_LOG_KEY)
    const parsed = raw ? (JSON.parse(raw) as string[]) : []
    expect(parsed.filter((value) => value === 'nonce-1')).toHaveLength(1)
  })
})
