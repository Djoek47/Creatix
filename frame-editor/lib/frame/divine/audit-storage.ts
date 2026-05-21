import type { DivineAuditEntry } from './audit-utils'

export const DIVINE_NONCE_LOG_KEY = 'markit:divine:used-nonces:v1'
export const DIVINE_AUDIT_LOG_KEY = 'markit:divine:audit-log:v1'

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null | undefined

export function loadAuditEntries(storage?: StorageLike): DivineAuditEntry[] {
  const target = resolveStorage(storage)
  if (!target) return []
  try {
    const raw = target.getItem(DIVINE_AUDIT_LOG_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as DivineAuditEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function appendAuditEntry(
  current: DivineAuditEntry[],
  nextEntry: DivineAuditEntry,
  storage?: StorageLike,
  maxEntries = 200,
): DivineAuditEntry[] {
  const next = [nextEntry, ...current].slice(0, maxEntries)
  const target = resolveStorage(storage)
  if (target) {
    try {
      target.setItem(DIVINE_AUDIT_LOG_KEY, JSON.stringify(next))
    } catch {
      // best-effort audit persistence
    }
  }
  return next
}

export function pruneAuditEntries(current: DivineAuditEntry[], limit: number, storage?: StorageLike): DivineAuditEntry[] {
  const next = current.slice(0, Math.max(0, limit))
  const target = resolveStorage(storage)
  if (target) {
    try {
      target.setItem(DIVINE_AUDIT_LOG_KEY, JSON.stringify(next))
    } catch {
      // best-effort audit persistence
    }
  }
  return next
}

export function clearAuditEntries(storage?: StorageLike) {
  const target = resolveStorage(storage)
  if (!target) return
  try {
    target.removeItem(DIVINE_AUDIT_LOG_KEY)
  } catch {
    // best-effort audit persistence
  }
}

export function nonceAlreadyUsed(nonce: string, storage?: StorageLike): boolean {
  const target = resolveStorage(storage)
  if (!target) return false
  try {
    const raw = target.getItem(DIVINE_NONCE_LOG_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) && parsed.includes(nonce)
  } catch {
    return false
  }
}

export function rememberNonce(nonce: string, storage?: StorageLike, maxEntries = 200) {
  const target = resolveStorage(storage)
  if (!target) return
  try {
    const raw = target.getItem(DIVINE_NONCE_LOG_KEY)
    const parsed = raw ? (JSON.parse(raw) as string[]) : []
    const next = Array.isArray(parsed) ? parsed.filter((item) => item !== nonce) : []
    next.unshift(nonce)
    target.setItem(DIVINE_NONCE_LOG_KEY, JSON.stringify(next.slice(0, maxEntries)))
  } catch {
    // best-effort replay protection
  }
}

function resolveStorage(storage?: StorageLike): StorageLike {
  if (storage !== undefined) return storage
  if (typeof window === 'undefined') return null
  return window.localStorage
}
