export const FAN_PROFILE_TYPES = [
  'fan',
  'whale',
  'creator',
  'paying_creator',
  'advertisement',
  'freeloader',
] as const

export type FanProfileType = (typeof FAN_PROFILE_TYPES)[number]

export function isFanProfileType(value: unknown): value is FanProfileType {
  if (typeof value !== 'string') return false
  return (FAN_PROFILE_TYPES as readonly string[]).includes(value)
}

export type AudienceProfileOverride = FanProfileType | null

/**
 * Backward-compatible mapping for older DB constraints that still only allow:
 * fan | whale | creator.
 */
export function toLegacyAudienceProfileType(value: FanProfileType): 'fan' | 'whale' | 'creator' {
  if (value === 'fan' || value === 'whale' || value === 'creator') return value
  if (value === 'paying_creator') return 'creator'
  if (value === 'advertisement' || value === 'freeloader') return 'fan'
  return 'fan'
}
