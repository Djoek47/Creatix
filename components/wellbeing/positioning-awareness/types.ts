/** Day = Circe (white / ivory). Night = Venus (purple). */
export type SceneDayNight = 'day' | 'night'

/** Pseudo-3D perspective grid vs flattened top-down 2D diagram. */
export type SceneDimension = 'perspective' | 'flat'

export type PositioningAwarenessStep = {
  id: string
  title: string
  bodyDay: string
  bodyNight: string
}
