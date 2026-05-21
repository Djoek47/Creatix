/**
 * Mirrors root `lib/divine-manager-deep-link.ts` — keep in sync when sections change.
 * Used so mobile `?section=` matches web Divine Manager behavior where the UI allows.
 */
export const DIVINE_MANAGER_SCROLL_SECTIONS = ['mimic', 'voice', 'tasks', 'alerts', 'protocol'] as const

export type DivineManagerScrollSection = (typeof DIVINE_MANAGER_SCROLL_SECTIONS)[number]

export function isDivineManagerScrollSection(section: string): section is DivineManagerScrollSection {
  return (DIVINE_MANAGER_SCROLL_SECTIONS as readonly string[]).includes(section)
}

/** Native scroll target keys for blocks on the Divine Manager screen (subset of web anchor ids). */
export type DivineManagerMobileScrollTarget = 'protocol' | 'voice' | 'chat'

/** Map web `?section=` to a scroll region on the mobile layout (Mimic / full alerts UI are web-first). */
export function divineManagerMobileScrollTarget(section: string): DivineManagerMobileScrollTarget | null {
  if (section === 'text' || section === 'chat') return 'chat'
  if (!isDivineManagerScrollSection(section)) return null
  if (section === 'voice') return 'voice'
  if (section === 'protocol' || section === 'tasks' || section === 'alerts') return 'protocol'
  if (section === 'mimic') return 'voice'
  return null
}
