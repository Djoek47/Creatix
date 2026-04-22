/** Short date string for AI Studio fantasy-writer calendar pickers and API summaries. */
export function formatFantasyRunnerDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
