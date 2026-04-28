/** Mark roots of visible credit-balance UI so the dashboard header can avoid duplicating the same readout on avatar hover. */
export const DASHBOARD_CREDIT_SUMMARY_MARK = {
  'data-dashboard-credit-summary': '',
} as const

export function isDashboardCreditSummaryVisible(): boolean {
  if (typeof document === 'undefined') return false
  return document.querySelector('[data-dashboard-credit-summary]') !== null
}
