/**
 * Resolves `tours.{tourId}.{stepId}.{field}` with fallback to tour-config copy.
 */
export function tourStepCopy(
  t: (key: string) => string,
  tourId: string,
  stepId: string,
  field: 'title' | 'description',
  fallback: string,
): string {
  const key = `${tourId}.${stepId}.${field}`
  const value = t(key)
  if (!value || value === key || value.startsWith('tours.')) return fallback
  return value
}
