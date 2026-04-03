import type { CreatorProtocolTaskRow } from '@/lib/creator-protocol-task-types'

type SortableTask = Pick<CreatorProtocolTaskRow, 'priority_tier' | 'sort_order' | 'created_at'>

/** Sort: tier asc, sort_order asc, created_at asc. */
export function compareProtocolTasksForPlan(a: SortableTask, b: SortableTask): number {
  const ta = a.priority_tier ?? 4
  const tb = b.priority_tier ?? 4
  if (ta !== tb) return ta - tb
  const sa = a.sort_order ?? 0
  const sb = b.sort_order ?? 0
  if (sa !== sb) return sa - sb
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
}

export function sortProtocolTasksForPlan<T extends SortableTask>(tasks: T[]): T[] {
  return [...tasks].sort(compareProtocolTasksForPlan)
}
