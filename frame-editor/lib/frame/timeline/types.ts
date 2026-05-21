export type TimelineSchemaVersion = 1

export type MediaKind = 'video' | 'audio' | 'image'
export type TrackKind = 'video' | 'audio' | 'overlay' | 'image'

export type MediaItem = {
  id: string
  kind: MediaKind
  name: string
  storagePath: string
  durationSec?: number
  width: number
  height: number
  codec?: string
  sizeBytes: number
  thumbnailPath?: string
  importedAt: string
  contentId?: string
}

export type Track = {
  id: string
  kind: TrackKind
  label: string
  order: number
  muted: boolean
  locked: boolean
  visible: boolean
}

export type Clip = {
  id: string
  trackId: string
  mediaId: string
  startSec: number
  inSec: number
  outSec: number
  volume: number
  opacity: number
  speedPct: number
  fadeInMs: number
  fadeOutMs: number
  cropX?: number
  cropY?: number
  cropW?: number
  cropH?: number
  rotationDeg?: number
}

export type TimelineState = {
  schemaVersion: TimelineSchemaVersion
  tracks: Track[]
  clips: Clip[]
  durationSec: number
}

export type ProjectState = {
  id: string
  name: string
  timeline: TimelineState
  media: MediaItem[]
  createdAt: string
  updatedAt: string
}

