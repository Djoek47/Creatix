/**
 * Resolves `guideOrbit.steps.{stepId}.{field}` with safe fallback (tour + Guide orbit).
 */
export function orbitGuideStepField(
  t: (key: string) => string,
  stepId: string,
  field: 'title' | 'description' | 'subjectLabel',
  fallback: string,
): string {
  const key = `steps.${stepId}.${field}`
  const value = t(key)
  if (!value || value === key || value.startsWith('guideOrbit.')) return fallback
  return value
}
