export type DivineGuidePageKey = 'well-being' | 'protection' | 'messages' | 'social'

export type DivineGuideControl = {
  id: string
  page: DivineGuidePageKey
  label: string
  action: 'explain' | 'scroll_highlight' | 'draft_only' | 'confirm_required'
}

export const DIVINE_GUIDE_CONTROLS: readonly DivineGuideControl[] = [
  { id: 'wellbeing-state-strip', page: 'well-being', label: 'Well-being daily status', action: 'explain' },
  { id: 'wellbeing-lunar-calendar', page: 'well-being', label: 'Well-being calendar', action: 'scroll_highlight' },
  { id: 'wellbeing-flow-state', page: 'well-being', label: 'Flow state coach', action: 'scroll_highlight' },
  { id: 'wellbeing-light-place', page: 'well-being', label: 'Light and place guidance', action: 'scroll_highlight' },
  { id: 'wellbeing-positioning-awareness', page: 'well-being', label: 'Positioning awareness', action: 'scroll_highlight' },
  { id: 'wellbeing-golden-hour', page: 'well-being', label: 'Golden-hour timing', action: 'scroll_highlight' },

  { id: 'protection-scan-setup', page: 'protection', label: 'Protection scan setup', action: 'scroll_highlight' },
  { id: 'protection-filter-queue', page: 'protection', label: 'Protection filter queue', action: 'scroll_highlight' },
  { id: 'protection-confirmed-leaks', page: 'protection', label: 'Confirmed leak cases', action: 'scroll_highlight' },
  { id: 'protection-triage-queue', page: 'protection', label: 'Leak triage queue', action: 'scroll_highlight' },
  { id: 'protection-classification-controls', page: 'protection', label: 'Leak classification controls', action: 'confirm_required' },
  { id: 'protection-dmca-self-takedown', page: 'protection', label: 'DMCA Self-Takedown', action: 'confirm_required' },

  { id: 'messages-workspace', page: 'messages', label: 'Messages workspace', action: 'scroll_highlight' },
  { id: 'messages-fan-list', page: 'messages', label: 'Fan inbox list', action: 'scroll_highlight' },
  { id: 'messages-thread', page: 'messages', label: 'Selected fan thread', action: 'scroll_highlight' },
  { id: 'messages-composer', page: 'messages', label: 'Message composer', action: 'draft_only' },
  { id: 'messages-ai-suggestions', page: 'messages', label: 'AI reply suggestions', action: 'draft_only' },

  { id: 'social-create-tabs', page: 'social', label: 'Social section tabs', action: 'scroll_highlight' },
  { id: 'social-platform-selector', page: 'social', label: 'Social platform selector', action: 'scroll_highlight' },
  { id: 'social-generate-ai', page: 'social', label: 'Generate with AI', action: 'draft_only' },
  { id: 'social-post-composer', page: 'social', label: 'Social post composer', action: 'draft_only' },
  { id: 'social-template-gallery', page: 'social', label: 'Social templates', action: 'draft_only' },
  { id: 'social-share-actions', page: 'social', label: 'Share and copy actions', action: 'confirm_required' },
] as const

export const DIVINE_GUIDE_CONTROL_IDS = DIVINE_GUIDE_CONTROLS.map((control) => control.id)

export function divinePageKeyForPath(path: string | undefined | null): DivineGuidePageKey | null {
  const clean = (path ?? '').split('?')[0].replace(/\/$/, '')
  if (clean === '/dashboard/well-being') return 'well-being'
  if (clean === '/dashboard/protection') return 'protection'
  if (clean === '/dashboard/messages') return 'messages'
  if (clean === '/dashboard/social') return 'social'
  return null
}

export function getDivineGuideControlsForPath(path: string | undefined | null): DivineGuideControl[] {
  const page = divinePageKeyForPath(path)
  if (!page) return []
  return DIVINE_GUIDE_CONTROLS.filter((control) => control.page === page)
}

export function isRegisteredDivineGuideControl(elementId: string | undefined | null, path?: string | null): boolean {
  if (!elementId) return false
  const page = divinePageKeyForPath(path)
  return DIVINE_GUIDE_CONTROLS.some((control) => control.id === elementId && (!page || control.page === page))
}
