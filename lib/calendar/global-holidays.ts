/** Cosmic calendar holiday map (shared with Content → Cosmic calendar). Key: `month-day` e.g. `2-14`. */
export type CosmicHolidayEntry = {
  name: string
  type: 'holiday' | 'event' | 'awareness'
  contentIdea: string
  icon: string
}

export const GLOBAL_HOLIDAYS: Record<string, CosmicHolidayEntry[]> = {
  '1-1': [{ name: "New Year's Day", type: 'holiday', contentIdea: 'Fresh start content, resolution-themed shoots', icon: '🎆' }],
  '2-14': [{ name: "Valentine's Day", type: 'holiday', contentIdea: 'Romantic, lingerie, couple themes', icon: '💕' }],
  '2-15': [{ name: "Singles Awareness Day", type: 'event', contentIdea: 'Self-love, independent, empowering content', icon: '💪' }],
  '3-8': [{ name: "International Women's Day", type: 'awareness', contentIdea: 'Empowerment, strength, beauty content', icon: '👑' }],
  '3-17': [{ name: "St. Patrick's Day", type: 'holiday', contentIdea: 'Green themed, lucky charm content', icon: '🍀' }],
  '3-20': [{ name: 'Spring Equinox', type: 'event', contentIdea: 'Rebirth, flower themes, outdoor shoots', icon: '🌸' }],
  '4-1': [{ name: "April Fools' Day", type: 'event', contentIdea: 'Playful, teasing, surprise content', icon: '🃏' }],
  '4-20': [{ name: '420 Day', type: 'event', contentIdea: 'Chill vibes, relaxed aesthetic', icon: '🌿' }],
  '4-22': [{ name: 'Earth Day', type: 'awareness', contentIdea: 'Nature shoots, outdoor content', icon: '🌍' }],
  '5-1': [{ name: 'May Day', type: 'event', contentIdea: 'Spring goddess, floral crowns', icon: '🌺' }],
  '5-4': [{ name: 'Star Wars Day', type: 'event', contentIdea: 'Sci-fi cosplay, space themes', icon: '⭐' }],
  '5-5': [{ name: 'Cinco de Mayo', type: 'holiday', contentIdea: 'Vibrant colors, festive themes', icon: '🎉' }],
  '5-12': [{ name: "Mother's Day (US)", type: 'holiday', contentIdea: 'Nurturing, soft, elegant content', icon: '💐' }],
  '6-1': [{ name: 'Pride Month Starts', type: 'awareness', contentIdea: 'Rainbow themes, inclusive content', icon: '🏳️‍🌈' }],
  '6-21': [{ name: 'Summer Solstice', type: 'event', contentIdea: 'Golden hour shoots, beach content', icon: '☀️' }],
  '7-4': [{ name: 'Independence Day (US)', type: 'holiday', contentIdea: 'Patriotic themes, fireworks, red/white/blue', icon: '🇺🇸' }],
  '7-14': [{ name: 'Bastille Day', type: 'holiday', contentIdea: 'French aesthetic, elegant, romantic', icon: '🇫🇷' }],
  '8-1': [{ name: 'Summer Peak', type: 'event', contentIdea: 'Beach, pool, bikini content', icon: '🏖️' }],
  '9-22': [{ name: 'Autumn Equinox', type: 'event', contentIdea: 'Fall colors, cozy aesthetic', icon: '🍂' }],
  '10-1': [{ name: 'Spooky Season Starts', type: 'event', contentIdea: 'Halloween prep, mysterious vibes', icon: '🎃' }],
  '10-31': [{ name: 'Halloween', type: 'holiday', contentIdea: 'Costumes, spooky sexy, themed shoots', icon: '👻' }],
  '11-1': [{ name: 'Day of the Dead', type: 'holiday', contentIdea: 'Sugar skull makeup, Mexican aesthetic', icon: '💀' }],
  '11-11': [{ name: 'Singles Day', type: 'event', contentIdea: 'Self-care, solo content, special deals', icon: '1️⃣' }],
  '11-28': [{ name: 'Thanksgiving (US)', type: 'holiday', contentIdea: 'Gratitude posts, cozy content', icon: '🦃' }],
  '11-29': [{ name: 'Black Friday', type: 'event', contentIdea: 'SALE content, special PPV deals', icon: '🛍️' }],
  '12-21': [{ name: 'Winter Solstice', type: 'event', contentIdea: 'Mystical, cozy, candlelight content', icon: '❄️' }],
  '12-25': [{ name: 'Christmas', type: 'holiday', contentIdea: 'Festive, gift themes, Santa aesthetic', icon: '🎄' }],
  '12-31': [{ name: "New Year's Eve", type: 'holiday', contentIdea: 'Glamorous, champagne, sparkles', icon: '🥂' }],
}

export function getHolidaysForDate(date: Date): CosmicHolidayEntry[] {
  const key = `${date.getMonth() + 1}-${date.getDate()}`
  return GLOBAL_HOLIDAYS[key] || []
}
