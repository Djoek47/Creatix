/** Shared types for dialog tours (see lib/tour-config.ts, lib/tour-full-app-welcome.ts). */

export interface TourStep {
  id: string
  title: string
  description: string
  /** When set, the tour navigates here while this step is active (App Router). */
  path?: string
  /** Element to spotlight, e.g. `[data-tour="/dashboard"]`. Omit for full-screen dim only. */
  targetSelector?: string
  /** If the primary target is missing or not visible (e.g. desktop-only control), try this selector. */
  targetSelectorFallback?: string
  /** Pixels of padding around the highlighted node (default 5). Lower = tighter to the control. */
  highlightPaddingPx?: number
}

export interface TourConfig {
  tourId: string
  steps: TourStep[]
}
