/**
 * Lets Divine tool UI actions open/scroll the header notifications popover
 * without prop-drilling. Notifications.tsx registers handlers on mount.
 */

export type NotificationPanelTab = 'live' | 'divine'

type Handlers = {
  setOpen: (open: boolean) => void
  setTab: (tab: NotificationPanelTab) => void
  requestScrollToId: (id: string | null) => void
}

let handlers: Handlers | null = null

export function registerNotificationUiHandlers(next: Handlers | null) {
  handlers = next
}

export type NotificationPanelDispatch = {
  open?: boolean
  tab?: NotificationPanelTab
  scrollToId?: string | null
}

export function dispatchNotificationPanelAction(action: NotificationPanelDispatch) {
  if (!handlers) return
  if (typeof action.open === 'boolean') handlers.setOpen(action.open)
  if (action.tab === 'live' || action.tab === 'divine') handlers.setTab(action.tab)
  if (action.scrollToId !== undefined) handlers.requestScrollToId(action.scrollToId)
}

export const PROTOCOL_TASKS_REFRESH_EVENT = 'creatix-protocol-tasks-refresh'

export const NOTIFICATIONS_INBOX_REFRESH_EVENT = 'creatix-notifications-inbox-refresh'

export function dispatchProtocolTasksRefresh() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(PROTOCOL_TASKS_REFRESH_EVENT))
}

/** Refetch Supabase `notifications` rows in the header bell (after Divine Manager marks read / removes). */
export function dispatchNotificationsInboxRefresh() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(NOTIFICATIONS_INBOX_REFRESH_EVENT))
}
