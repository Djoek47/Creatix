/** Window event: sidebar Messages nav listens; messages workspace broadcasts after inbox loads. */
export const MESSAGES_NAV_UNREAD_EVENT = 'creatix:messages-nav-unread'

export function dispatchMessagesNavUnreadTotal(total: number) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(MESSAGES_NAV_UNREAD_EVENT, {
      detail: { total: Math.max(0, Math.round(Number(total) || 0)) },
    }),
  )
}
