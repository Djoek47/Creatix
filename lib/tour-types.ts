/** Shared types for dialog tours (see lib/tour-config.ts, lib/tour-full-app-welcome.ts). */

export interface TourStep {
  id: string
  title: string
  description: string
}

export interface TourConfig {
  tourId: string
  steps: TourStep[]
}
