import { cn } from '@/lib/utils'

export const DASHBOARD_MESSAGES_NAV_HREF = '/dashboard/messages'

/** Icon: color + filter + subtle lift (sidebar row animates icon separately from the pill surface). */
const messagesNavIconTransitionClass =
  'duration-200 ease-out transition-[color,filter,transform] group-hover:scale-[1.04] motion-reduce:transition-[color,filter] motion-reduce:group-hover:scale-100'
/** Label: color + text-shadow. */
const messagesNavLabelTransitionClass = 'duration-200 ease-out transition-[color,text-shadow]'

/** Silver-rail Messages row: icon halo via `.dashboard-messages-nav-icon-halo` (globals) — dual drop-shadow matches label bloom. */
export function dashboardMessagesNavIconClass(isActive: boolean) {
  return cn(
    messagesNavIconTransitionClass,
    'dashboard-messages-nav-icon-halo',
    isActive && 'dashboard-messages-nav-icon-halo--active',
    'text-sky-600 dark:text-sky-400',
    'group-hover:text-sky-500 dark:group-hover:text-sky-300',
    'motion-reduce:transition-none',
    isActive &&
      cn(
        'text-sky-700 dark:text-sky-300',
        'group-hover:text-sky-700 dark:group-hover:text-sky-300',
      ),
  )
}

/** Matching label styling + hover/active steps aligned with {@link dashboardMessagesNavIconClass}. */
export function dashboardMessagesNavLabelClass(isActive: boolean) {
  return cn(
    messagesNavLabelTransitionClass,
    'font-medium tracking-tight text-sky-700 dark:text-sky-300',
    '[text-shadow:0_0_14px_rgba(56,189,248,0.4)] dark:[text-shadow:0_0_16px_rgba(56,189,248,0.38)]',
    'group-hover:text-sky-600 dark:group-hover:text-sky-200',
    'group-hover:[text-shadow:0_0_18px_rgba(56,189,248,0.48)] dark:group-hover:[text-shadow:0_0_20px_rgba(125,211,252,0.45)]',
    'motion-reduce:transition-none motion-reduce:[text-shadow:none]',
    isActive &&
      cn(
        'text-sky-700 dark:text-sky-300',
        '[text-shadow:0_0_18px_rgba(56,189,248,0.5)] dark:[text-shadow:0_0_20px_rgba(125,211,252,0.48)]',
        'group-hover:text-sky-700 dark:group-hover:text-sky-300',
        'group-hover:[text-shadow:0_0_20px_rgba(56,189,248,0.52)] dark:group-hover:[text-shadow:0_0_22px_rgba(125,211,252,0.5)]',
        'motion-reduce:[text-shadow:none]',
      ),
  )
}

/** Full R→L sweep duration; speeds up as unread count rises (seconds). */
export function messagesNavSweepSeconds(unreadTotal: number): number {
  const u = Math.max(0, unreadTotal)
  if (u <= 0) return 2.85
  return Math.min(2.95, Math.max(0.5, 2.85 / (1 + u * 0.068)))
}
