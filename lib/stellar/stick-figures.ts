/**
 * Recognizable constellation stick figures (bright stars, J2000 RA/Dec in degrees).
 * Used for projecting the local celestial sphere—not an exhaustive atlas.
 */

export type StickEdge = {
  id: string
  raDecA: readonly [number, number]
  raDecB: readonly [number, number]
}

export const STAR_STICK_FIGURES: StickEdge[] = [
  // Orion
  { id: 'or', raDecA: [88.7929, 7.4071], raDecB: [81.2828, 6.3497] },
  { id: 'or', raDecA: [88.7929, 7.4071], raDecB: [85.1897, -1.9426] },
  { id: 'or', raDecA: [85.1897, -1.9426], raDecB: [84.0523, -1.2019] },
  { id: 'or', raDecA: [84.0523, -1.2019], raDecB: [83.7842, -0.2987] },
  { id: 'or', raDecA: [81.2828, 6.3497], raDecB: [84.0523, -1.2019] },
  { id: 'or', raDecA: [78.6345, -8.2016], raDecB: [83.7842, -0.2987] },
  { id: 'or', raDecA: [82.9743, -8.97289], raDecB: [78.6345, -8.2016] },
  // Ursa Major
  { id: 'uma', raDecA: [165.9319, 61.751], raDecB: [165.4603, 56.3824] },
  { id: 'uma', raDecA: [165.4603, 56.3824], raDecB: [183.8565, 57.0326] },
  { id: 'uma', raDecA: [183.8565, 57.0326], raDecB: [178.4573, 53.6948] },
  { id: 'uma', raDecA: [165.9319, 61.751], raDecB: [178.4573, 53.6948] },
  { id: 'uma', raDecA: [183.8565, 57.0326], raDecB: [193.5089, 55.9598] },
  { id: 'uma', raDecA: [193.5089, 55.9598], raDecB: [200.9813, 54.9242] },
  { id: 'uma', raDecA: [200.9813, 54.9242], raDecB: [206.8846, 49.3123] },
  // Gemini
  { id: 'gem', raDecA: [113.6793, 31.9643], raDecB: [116.3291, 28.086] },
  // Scorpius (heart → tail anchor)
  { id: 'sco', raDecA: [247.3519, -26.432], raDecB: [266.5953, -37.1036] },
  // Cygnus (Northern Cross, without Lyra/Vega)
  { id: 'cyg', raDecA: [310.3579, 45.2793], raDecB: [305.5521, 40.3566] },
  { id: 'cyg', raDecA: [305.5521, 40.3566], raDecB: [292.6804, 27.9625] },
  // Leo
  { id: 'leo', raDecA: [152.0927, 11.9672], raDecB: [177.2649, 14.5721] },
]
