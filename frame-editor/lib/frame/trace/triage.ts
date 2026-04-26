export type RecipientRun = {
  recipientKey: string
}

export type IdentifiedRecipientRun = RecipientRun & {
  id: string
}

export function normalizeRecipientKey(value: string): string {
  return value.trim().toLowerCase()
}

export function isRecipientFocused(recipientKey: string, normalizedRecipientKey: string): boolean {
  if (!normalizedRecipientKey) return false
  return normalizeRecipientKey(recipientKey) === normalizedRecipientKey
}

export function hasRecipientMatch<T extends RecipientRun>(runs: T[], normalizedRecipientKey: string): boolean {
  if (!normalizedRecipientKey) return false
  return runs.some((run) => isRecipientFocused(run.recipientKey, normalizedRecipientKey))
}

export function filterRunsForRecipientFocus<T extends RecipientRun>(
  runs: T[],
  normalizedRecipientKey: string,
  showOnlyFocusedRuns: boolean,
): T[] {
  if (!showOnlyFocusedRuns || !normalizedRecipientKey) return runs
  return runs.filter((run) => isRecipientFocused(run.recipientKey, normalizedRecipientKey))
}

export function getFirstRecipientMatchId<T extends IdentifiedRecipientRun>(
  runs: T[],
  normalizedRecipientKey: string,
): string | null {
  if (!normalizedRecipientKey) return null
  return runs.find((run) => isRecipientFocused(run.recipientKey, normalizedRecipientKey))?.id || null
}
