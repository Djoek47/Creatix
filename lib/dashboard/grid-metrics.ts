/** Must stay in sync with `rowHeight` / `margin[1]` on `DashboardWidgetsGrid` GridLayout. */
export const DASHBOARD_ROW_HEIGHT = 30
export const DASHBOARD_MARGIN_Y = 18

/**
 * Minimum grid row count to fit content of `pixels` height (same basis as react-grid-layout calcWH / grid spans).
 */
export function pixelsToGridH(
  pixels: number,
  rowHeight = DASHBOARD_ROW_HEIGHT,
  marginY = DASHBOARD_MARGIN_Y,
): number {
  const padded = Math.max(0, pixels + 8)
  return Math.max(1, Math.ceil((padded + marginY) / (rowHeight + marginY) - 1e-9))
}
