/** Chinese New Year (Gregorian) — lookup for lunar year boundary. Extend as needed. */
const CNY: Record<number, [number, number]> = {
  2015: [1, 19],
  2016: [1, 8],
  2017: [0, 28],
  2018: [1, 16],
  2019: [1, 5],
  2020: [0, 25],
  2021: [1, 12],
  2022: [1, 1],
  2023: [0, 22],
  2024: [1, 10],
  2025: [0, 29],
  2026: [1, 17],
  2027: [1, 6],
  2028: [0, 26],
  2029: [1, 13],
  2030: [1, 3],
  2031: [0, 23],
  2032: [1, 11],
  2033: [0, 31],
  2034: [1, 19],
  2035: [1, 8],
}

export function getChineseNewYearDate(year: number): Date {
  const m = CNY[year]
  if (m) return new Date(year, m[0], m[1])
  const prev = CNY[year - 1]
  if (prev) return new Date(year, 0, 15)
  return new Date(year, 1, 1)
}

/** Twelve lunar animals (Rat … Pig), ordered from 1900 onward — compile-time literal unions for fields. */
export const CHINESE_ZODIAC = [
  { id: 'rat', animal: 'Rat', han: '鼠', emoji: '🐀', vibe: 'Quick wit, charm, new starts' },
  { id: 'ox', animal: 'Ox', han: '牛', emoji: '🐂', vibe: 'Steady strength, quiet luxury' },
  { id: 'tiger', animal: 'Tiger', han: '虎', emoji: '🐅', vibe: 'Bold moves, magnetic courage' },
  { id: 'rabbit', animal: 'Rabbit', han: '兔', emoji: '🐇', vibe: 'Soft glamour, peace, luck' },
  { id: 'dragon', animal: 'Dragon', han: '龍', emoji: '🐉', vibe: 'Main-character energy, shine' },
  { id: 'snake', animal: 'Snake', han: '蛇', emoji: '🐍', vibe: 'Mystery, sensuality, depth' },
  { id: 'horse', animal: 'Horse', han: '馬', emoji: '🐴', vibe: 'Freedom, passion, momentum' },
  { id: 'goat', animal: 'Goat', han: '羊', emoji: '🐐', vibe: 'Artistry, tenderness, taste' },
  { id: 'monkey', animal: 'Monkey', han: '猴', emoji: '🐵', vibe: 'Play, cleverness, joy' },
  { id: 'rooster', animal: 'Rooster', han: '雞', emoji: '🐓', vibe: 'Confidence, flair, dawn energy' },
  { id: 'dog', animal: 'Dog', han: '狗', emoji: '🐕', vibe: 'Loyalty, heart, protection' },
  { id: 'pig', animal: 'Pig', han: '豬', emoji: '🐷', vibe: 'Abundance, pleasure, ease' },
] as const

/** Entry from {@link CHINESE_ZODIAC}: twelve lunar animals with literals for id / emoji / han / animal names. */
export type ChineseZodiacAnimal = (typeof CHINESE_ZODIAC)[number]

export type ChineseZodiacId = ChineseZodiacAnimal['id']

type ChineseZodiacIndex =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11

/** Lunar year for a calendar date (before CNY counts as previous zodiac year). */
export function getLunarYear(d: Date): number {
  const y = d.getFullYear()
  const cny = getChineseNewYearDate(y)
  return d < cny ? y - 1 : y
}

function lunarYearToZodiacIndex(lunarYear: number): ChineseZodiacIndex {
  const idx = ((lunarYear - 1900) % 12 + 12) % 12
  return idx as ChineseZodiacIndex
}

export function getChineseZodiacForDate(d: Date): ChineseZodiacAnimal {
  return CHINESE_ZODIAC[lunarYearToZodiacIndex(getLunarYear(d))]
}
