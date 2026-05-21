import type { Fan } from '@/lib/types'

function normalizeFanSearchQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@+/, '')
}

/**
 * Client-side search over the in-memory fan list (name + @handle).
 * For very large DB-only views, server paging/search should augment this later.
 */
export function filterFansBySearchQuery(fans: Fan[], query: string): Fan[] {
  const q = normalizeFanSearchQuery(query)
  if (!q) return fans

  return fans.filter((f) => {
    const display = (f.display_name || '').toLowerCase()
    const handle = (f.platform_username || '').toLowerCase()
    return display.includes(q) || handle.includes(q)
  })
}
