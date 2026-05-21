import { FRAME_DEFAULT_IMAGE_DURATION_SEC, FRAME_DEFAULT_VIDEO_DURATION_SEC } from './defaults'
import type { Track } from './types'

export type ImportableMediaKind = 'video' | 'image'

export function ensureRequiredTracks(tracks: Track[]): Track[] {
  const next = [...tracks]
  const kindOrder: Record<Track['kind'], number> = {
    video: 0,
    audio: 1,
    image: 2,
    overlay: 3,
  }
  const required: Array<{ kind: Track['kind']; id: string; label: string; order: number }> = [
    { kind: 'video', id: 'track-v1', label: 'V1', order: 0 },
    { kind: 'audio', id: 'track-a1', label: 'A1', order: 1 },
    { kind: 'image', id: 'track-img1', label: 'IMG', order: 2 },
    { kind: 'overlay', id: 'track-ov1', label: 'OV', order: 3 },
  ]
  for (const req of required) {
    const exists = next.some((track) => track.kind === req.kind)
    if (exists) continue
    next.push({
      id: req.id,
      kind: req.kind,
      label: req.label,
      order: req.order,
      muted: false,
      locked: false,
      visible: true,
    })
  }
  return next
    .sort((a, b) => {
      const ao = kindOrder[a.kind] ?? 99
      const bo = kindOrder[b.kind] ?? 99
      if (ao !== bo) return ao - bo
      if (a.order !== b.order) return a.order - b.order
      return a.id.localeCompare(b.id)
    })
    .map((track, index) => ({ ...track, order: index }))
}

export function resolveLibraryImportDurationSec(kind: ImportableMediaKind, durationSec?: number): number {
  const fallback = kind === 'video' ? FRAME_DEFAULT_VIDEO_DURATION_SEC : FRAME_DEFAULT_IMAGE_DURATION_SEC
  return Math.max(1, durationSec || fallback)
}

export function resolveImportTrackId(tracks: Track[], kind: ImportableMediaKind): string | null {
  const targetKind: Track['kind'] = kind === 'image' ? 'image' : 'video'
  const track = tracks.find((item) => item.kind === targetKind)
  return track?.id || null
}
