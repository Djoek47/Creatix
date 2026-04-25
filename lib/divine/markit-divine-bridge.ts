/**
 * In-memory bridge for Markit Divine SSE: per-user action queue + last registered editor context.
 * Replace with Redis / Realtime when scaling beyond one Node instance.
 */

type Queued = { action: unknown; ts: number }

const actionQueues = new Map<string, Queued[]>()
const editorContexts = new Map<string, unknown>()

const MAX_QUEUE = 50

export function enqueueMarkitDivineAction(userId: string, action: unknown) {
  const q = actionQueues.get(userId) ?? []
  q.push({ action, ts: Date.now() })
  actionQueues.set(userId, q.slice(-MAX_QUEUE))
}

export function drainMarkitDivineActions(userId: string): unknown[] {
  const q = actionQueues.get(userId) ?? []
  actionQueues.set(userId, [])
  return q.map((x) => x.action)
}

export function setMarkitEditorContext(userId: string, ctx: unknown) {
  editorContexts.set(userId, ctx)
}

export function getMarkitEditorContext(userId: string): unknown {
  return editorContexts.get(userId)
}
