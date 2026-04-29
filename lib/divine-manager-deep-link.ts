/** Values of ?section= on Divine Manager that scroll to a page anchor (not the text sheet). */
export const DIVINE_MANAGER_SCROLL_SECTIONS = ['mimic', 'voice', 'tasks', 'alerts', 'protocol'] as const

export type DivineManagerScrollSection = (typeof DIVINE_MANAGER_SCROLL_SECTIONS)[number]

export function isDivineManagerScrollSection(section: string): section is DivineManagerScrollSection {
  return (DIVINE_MANAGER_SCROLL_SECTIONS as readonly string[]).includes(section)
}

/** Element id to scroll into view for ?section=; protocol uses the combined workflow wrapper. */
export function divineManagerScrollElementId(section: DivineManagerScrollSection): string {
  if (section === 'protocol') return 'divine-section-protocol'
  return `divine-section-${section}`
}
