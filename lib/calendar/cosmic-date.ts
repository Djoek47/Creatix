/**
 * Lunar / zodiac calendar helpers shared by cosmic calendar variants.
 */

import { getHolidaysForDate } from '@/lib/calendar/global-holidays'
import { getChineseZodiacForDate } from '@/lib/calendar/chinese-zodiac'

export const moonPhases = [
  { name: 'New Moon', icon: '🌑', energy: 'New beginnings, set intentions', contentTip: 'Tease upcoming content, build anticipation' },
  { name: 'Waxing Crescent', icon: '🌒', energy: 'Growth, momentum', contentTip: 'Reveal sneak peeks, grow engagement' },
  { name: 'First Quarter', icon: '🌓', energy: 'Action, decisions', contentTip: 'Launch PPV, push for conversions' },
  { name: 'Waxing Gibbous', icon: '🌔', energy: 'Refinement, patience', contentTip: 'Premium content, detailed reveals' },
  { name: 'Full Moon', icon: '🌕', energy: 'Peak energy, manifestation', contentTip: 'Your BEST content, maximum engagement' },
  { name: 'Waning Gibbous', icon: '🌖', energy: 'Gratitude, sharing', contentTip: 'Behind the scenes, fan appreciation' },
  { name: 'Last Quarter', icon: '🌗', energy: 'Release, reflection', contentTip: 'Throwbacks, reflective content' },
  { name: 'Waning Crescent', icon: '🌘', energy: 'Rest, introspection', contentTip: 'Soft content, intimate moments' },
]

export const zodiacSigns = [
  { name: 'Aries', symbol: '♈', element: 'fire', dates: 'Mar 21 - Apr 19', energy: 'Bold, passionate, direct' },
  { name: 'Taurus', symbol: '♉', element: 'earth', dates: 'Apr 20 - May 20', energy: 'Sensual, luxurious, steady' },
  { name: 'Gemini', symbol: '♊', element: 'air', dates: 'May 21 - Jun 20', energy: 'Playful, curious, versatile' },
  { name: 'Cancer', symbol: '♋', element: 'water', dates: 'Jun 21 - Jul 22', energy: 'Intimate, nurturing, emotional' },
  { name: 'Leo', symbol: '♌', element: 'fire', dates: 'Jul 23 - Aug 22', energy: 'Dramatic, confident, glamorous' },
  { name: 'Virgo', symbol: '♍', element: 'earth', dates: 'Aug 23 - Sep 22', energy: 'Refined, detailed, elegant' },
  { name: 'Libra', symbol: '♎', element: 'air', dates: 'Sep 23 - Oct 22', energy: 'Romantic, aesthetic, balanced' },
  { name: 'Scorpio', symbol: '♏', element: 'water', dates: 'Oct 23 - Nov 21', energy: 'Intense, mysterious, magnetic' },
  { name: 'Sagittarius', symbol: '♐', element: 'fire', dates: 'Nov 22 - Dec 21', energy: 'Adventurous, free, exciting' },
  { name: 'Capricorn', symbol: '♑', element: 'earth', dates: 'Dec 22 - Jan 19', energy: 'Sophisticated, ambitious, classy' },
  { name: 'Aquarius', symbol: '♒', element: 'air', dates: 'Jan 20 - Feb 18', energy: 'Unique, innovative, eccentric' },
  { name: 'Pisces', symbol: '♓', element: 'water', dates: 'Feb 19 - Mar 20', energy: 'Dreamy, artistic, ethereal' },
]

export function getCurrentZodiac(date: Date) {
  const month = date.getMonth() + 1
  const day = date.getDate()

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return zodiacSigns[0]
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return zodiacSigns[1]
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return zodiacSigns[2]
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return zodiacSigns[3]
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return zodiacSigns[4]
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return zodiacSigns[5]
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return zodiacSigns[6]
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return zodiacSigns[7]
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return zodiacSigns[8]
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return zodiacSigns[9]
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return zodiacSigns[10]
  return zodiacSigns[11]
}

export function getMoonPhaseIndex(date: Date) {
  const knownNewMoon = new Date('2024-01-11')
  const lunarCycle = 29.53
  const daysSinceNew = Math.floor((date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24))
  const daysIntoPhase = ((daysSinceNew % lunarCycle) + lunarCycle) % lunarCycle
  return Math.floor((daysIntoPhase / lunarCycle) * 8) % 8
}

export function getMoonPhase(date: Date) {
  const phaseIndex = getMoonPhaseIndex(date)
  return { ...moonPhases[phaseIndex], phaseIndex }
}

export function generateCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days: Array<null | {
    day: number
    date: Date
    zodiac: (typeof zodiacSigns)[number]
    moonPhase: ReturnType<typeof getMoonPhase> & {}
    moonPhaseIndex: number
    chineseZodiac: ReturnType<typeof getChineseZodiacForDate>
    holidays: ReturnType<typeof getHolidaysForDate>
    isToday: boolean
    cosmicScore: number
  }> = []

  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push(null)
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day)
    const holidays = getHolidaysForDate(date)
    days.push({
      day,
      date,
      zodiac: getCurrentZodiac(date),
      moonPhase: getMoonPhase(date),
      moonPhaseIndex: getMoonPhaseIndex(date),
      chineseZodiac: getChineseZodiacForDate(date),
      holidays,
      isToday: new Date().toDateString() === date.toDateString(),
      cosmicScore: Math.floor(50 + Math.sin(day * 0.5) * 30 + Math.cos(day * 0.3) * 20),
    })
  }

  return days
}

export type CosmicCalendarDayCell = Exclude<ReturnType<typeof generateCalendarDays>[number], null>
