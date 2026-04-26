import { describe, expect, it } from 'vitest'
import { createDefaultProjectState } from './defaults'
import { applyClipCrop, applyClipTrim, applyImageClipDurationPreset } from './use-project-draft'

describe('applyImageClipDurationPreset', () => {
  it('updates only image clips and recomputes timeline duration', () => {
    const base = createDefaultProjectState()
    const project = {
      ...base,
      updatedAt: '2026-01-01T00:00:00.000Z',
      media: [
        {
          id: 'media-image-1',
          kind: 'image' as const,
          name: 'still 1',
          storagePath: 'library://still-1',
          durationSec: 4,
          width: 1080,
          height: 1080,
          sizeBytes: 0,
          importedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'media-video-1',
          kind: 'video' as const,
          name: 'video 1',
          storagePath: 'library://video-1',
          durationSec: 5,
          width: 1080,
          height: 1920,
          sizeBytes: 0,
          importedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      timeline: {
        ...base.timeline,
        durationSec: 10,
        clips: [
          {
            id: 'clip-image-1',
            trackId: 'track-img1',
            mediaId: 'media-image-1',
            startSec: 0,
            inSec: 0,
            outSec: 4,
            volume: 1,
            opacity: 1,
            speedPct: 100,
            fadeInMs: 0,
            fadeOutMs: 0,
          },
          {
            id: 'clip-video-1',
            trackId: 'track-v1',
            mediaId: 'media-video-1',
            startSec: 5,
            inSec: 0,
            outSec: 5,
            volume: 1,
            opacity: 1,
            speedPct: 100,
            fadeInMs: 0,
            fadeOutMs: 0,
          },
        ],
      },
    }

    const next = applyImageClipDurationPreset(project, 'clip-image-1', 7)

    expect(next.timeline.clips.find((clip) => clip.id === 'clip-image-1')?.outSec).toBe(7)
    expect(next.timeline.clips.find((clip) => clip.id === 'clip-video-1')?.outSec).toBe(5)
    expect(next.timeline.durationSec).toBe(10)
    expect(next.updatedAt).not.toBe(project.updatedAt)
  })

  it('enforces minimum duration and extends timeline end when needed', () => {
    const base = createDefaultProjectState()
    const project = {
      ...base,
      media: [
        {
          id: 'media-image-2',
          kind: 'image' as const,
          name: 'still 2',
          storagePath: 'library://still-2',
          durationSec: 4,
          width: 1080,
          height: 1080,
          sizeBytes: 0,
          importedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      timeline: {
        ...base.timeline,
        durationSec: 4,
        clips: [
          {
            id: 'clip-image-2',
            trackId: 'track-img1',
            mediaId: 'media-image-2',
            startSec: 3,
            inSec: 0,
            outSec: 4,
            volume: 1,
            opacity: 1,
            speedPct: 100,
            fadeInMs: 0,
            fadeOutMs: 0,
          },
        ],
      },
    }

    const minimum = applyImageClipDurationPreset(project, 'clip-image-2', 0)
    expect(minimum.timeline.clips[0]?.outSec).toBe(1)
    expect(minimum.timeline.durationSec).toBe(4)

    const extended = applyImageClipDurationPreset(project, 'clip-image-2', 8)
    expect(extended.timeline.clips[0]?.outSec).toBe(8)
    expect(extended.timeline.durationSec).toBe(11)
  })

  it('is a no-op for missing clips or non-image clips', () => {
    const base = createDefaultProjectState()
    const project = {
      ...base,
      media: [
        {
          id: 'media-video-only',
          kind: 'video' as const,
          name: 'video only',
          storagePath: 'library://video-only',
          durationSec: 5,
          width: 1080,
          height: 1920,
          sizeBytes: 0,
          importedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      timeline: {
        ...base.timeline,
        durationSec: 5,
        clips: [
          {
            id: 'clip-video-only',
            trackId: 'track-v1',
            mediaId: 'media-video-only',
            startSec: 0,
            inSec: 0,
            outSec: 5,
            volume: 1,
            opacity: 1,
            speedPct: 100,
            fadeInMs: 0,
            fadeOutMs: 0,
          },
        ],
      },
    }

    expect(applyImageClipDurationPreset(project, 'clip-missing', 6)).toBe(project)
    expect(applyImageClipDurationPreset(project, 'clip-video-only', 6)).toBe(project)
  })
})

describe('applyClipTrim', () => {
  it('updates clip trim window and recomputes timeline duration', () => {
    const base = createDefaultProjectState()
    const project = {
      ...base,
      timeline: {
        ...base.timeline,
        durationSec: 6,
        clips: [
          {
            id: 'clip-1',
            trackId: 'track-v1',
            mediaId: 'media-1',
            startSec: 0,
            inSec: 0,
            outSec: 5,
            volume: 1,
            opacity: 1,
            speedPct: 100,
            fadeInMs: 0,
            fadeOutMs: 0,
          },
        ],
      },
    }
    const next = applyClipTrim(project, 'clip-1', 1, 3.5)
    expect(next.timeline.clips[0]?.inSec).toBe(1)
    expect(next.timeline.clips[0]?.outSec).toBe(3.5)
    expect(next.timeline.durationSec).toBe(2.5)
  })
})

describe('applyClipCrop', () => {
  it('applies crop bounds to visual clips only', () => {
    const base = createDefaultProjectState()
    const visualProject = {
      ...base,
      media: [
        {
          id: 'media-video-1',
          kind: 'video' as const,
          name: 'Video',
          storagePath: 'library://video-1',
          durationSec: 5,
          width: 1080,
          height: 1920,
          sizeBytes: 0,
          importedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      timeline: {
        ...base.timeline,
        clips: [
          {
            id: 'clip-video-1',
            trackId: 'track-v1',
            mediaId: 'media-video-1',
            startSec: 0,
            inSec: 0,
            outSec: 5,
            volume: 1,
            opacity: 1,
            speedPct: 100,
            fadeInMs: 0,
            fadeOutMs: 0,
          },
        ],
      },
    }
    const cropped = applyClipCrop(visualProject, 'clip-video-1', { x: -1, y: 0.1, w: 2, h: 0.01 })
    expect(cropped.timeline.clips[0]?.cropX).toBe(0)
    expect(cropped.timeline.clips[0]?.cropY).toBe(0.1)
    expect(cropped.timeline.clips[0]?.cropW).toBe(1)
    expect(cropped.timeline.clips[0]?.cropH).toBe(0.05)
  })
})
