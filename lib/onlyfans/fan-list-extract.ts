/** Partner responses vary: `{ data: [] }`, `{ fans: [] }`, nested `result`, or a bare array. */
export function extractOnlyFansFanRows(payload: unknown): unknown[] {
  if (payload == null) return []
  if (Array.isArray(payload)) return payload
  if (typeof payload !== 'object') return []
  const o = payload as Record<string, unknown>
  if (Array.isArray(o.data)) return o.data
  if (Array.isArray(o.fans)) return o.fans
  if (Array.isArray(o.results)) return o.results
  if (Array.isArray(o.items)) return o.items
  const nested = o.data
  if (nested && typeof nested === 'object') {
    const d = nested as Record<string, unknown>
    if (Array.isArray(d.fans)) return d.fans
    if (Array.isArray(d.data)) return d.data
  }
  return []
}
