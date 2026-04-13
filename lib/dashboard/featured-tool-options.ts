import { ALL_TOOLS_META, type AIToolMeta } from '@/lib/ai-tools-data'

/** Default pinned tool for the dashboard featured slot. */
export const DEFAULT_FEATURED_TOOL_ID = 'standard-of-attraction'

/** Runnable tools the user can pin on the dashboard (same set Divine can invoke). */
export function listFeaturedToolCandidates(): AIToolMeta[] {
  return ALL_TOOLS_META.filter((t) => t.hasRunner && !t.comingSoon).sort((a, b) => a.name.localeCompare(b.name))
}
