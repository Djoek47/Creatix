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
