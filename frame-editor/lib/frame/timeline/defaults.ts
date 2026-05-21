import type { ProjectState } from '@/lib/frame/timeline/types'

export const FRAME_PROJECT_DRAFT_KEY = 'frame-editor:project-draft:v1'
export const FRAME_DEFAULT_VIDEO_DURATION_SEC = 5
export const FRAME_DEFAULT_IMAGE_DURATION_SEC = 4

export function createDefaultProjectState(): ProjectState {
  const now = new Date().toISOString()
  return {
    id: 'draft-project',
    name: 'Untitled Frame Project',
    createdAt: now,
    updatedAt: now,
    media: [],
    timeline: {
      schemaVersion: 1,
      durationSec: 0,
      tracks: [
        { id: 'track-v1', kind: 'video', label: 'V1', order: 0, muted: false, locked: false, visible: true },
        { id: 'track-a1', kind: 'audio', label: 'A1', order: 1, muted: false, locked: false, visible: true },
        { id: 'track-img1', kind: 'image', label: 'IMG', order: 2, muted: false, locked: false, visible: true },
        { id: 'track-ov1', kind: 'overlay', label: 'OV', order: 3, muted: false, locked: false, visible: true },
      ],
      clips: [],
    },
  }
}

