/**
 * Persist read + dismissed state for platform-pull notifications (IDs like `of-…`, `fs-…`).
 * The OF/Fansly APIs always return "fresh" items; without this, reopening the inbox resets read/dismiss.
 */

const PREFIX = 'creatix:platform-pull-notification-state:v1:'

const MAX_IDS = 400

type Stored = { read: string[]; dismissed: string[] }

function readStored(userId: string): Stored {
  if (typeof window === 'undefined') return { read: [], dismissed: [] }
  try {
    const raw = window.localStorage.getItem(PREFIX + userId)
    if (!raw) return { read: [], dismissed: [] }
    const p = JSON.parse(raw) as Partial<Stored>
    return {
      read: Array.isArray(p.read) ? p.read.filter((x): x is string => typeof x === 'string') : [],
      dismissed: Array.isArray(p.dismissed)
        ? p.dismissed.filter((x): x is string => typeof x === 'string')
        : [],
    }
  } catch {
    return { read: [], dismissed: [] }
  }
}

function writeStored(userId: string, next: Stored) {
  if (typeof window === 'undefined') return
  const read = [...new Set(next.read)].slice(-MAX_IDS)
  const dismissed = [...new Set(next.dismissed)].slice(-MAX_IDS)
  window.localStorage.setItem(PREFIX + userId, JSON.stringify({ read, dismissed }))
}

export function applyPullNotificationOverlay<T extends { id: string; read?: boolean }>(
  userId: string | null,
  items: T[],
): T[] {
  if (!userId) return items.map((i) => ({ ...i, read: !!i.read }))
  const { read, dismissed } = readStored(userId)
  const readSet = new Set(read)
  const dismissedSet = new Set(dismissed)
  return items
    .filter((i) => !dismissedSet.has(i.id))
    .map((i) => ({
      ...i,
      read: readSet.has(i.id) ? true : !!i.read,
    }))
}

export function markPullNotificationRead(userId: string, id: string) {
  if (!id.startsWith('of-') && !id.startsWith('fs-')) return
  const s = readStored(userId)
  if (!s.read.includes(id)) s.read.push(id)
  writeStored(userId, s)
}

export function dismissPullNotification(userId: string, id: string) {
  if (!id.startsWith('of-') && !id.startsWith('fs-')) return
  const s = readStored(userId)
  if (!s.dismissed.includes(id)) s.dismissed.push(id)
  s.read = s.read.filter((x) => x !== id)
  writeStored(userId, s)
}

export function markAllPullNotificationsRead(userId: string, ids: string[]) {
  const pullIds = ids.filter((id) => id.startsWith('of-') || id.startsWith('fs-'))
  if (pullIds.length === 0) return
  const s = readStored(userId)
  const set = new Set([...s.read, ...pullIds])
  s.read = [...set].slice(-MAX_IDS)
  writeStored(userId, s)
}

/** Clears dismissed pull IDs so previously hidden rows can show again (read flags unchanged). */
export function clearPullDismissed(userId: string) {
  const s = readStored(userId)
  s.dismissed = []
  writeStored(userId, s)
}

export function countPullDismissed(userId: string): number {
  return readStored(userId).dismissed.length
}
