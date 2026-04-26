import { describe, expect, it } from 'vitest'
import { ensureRequiredTracks, resolveImportTrackId, resolveLibraryImportDurationSec } from './import-rules'
import type { Track } from './types'

describe('timeline import rules', () => {
  it('ensures required lanes exist and are ordered', () => {
    const tracks: Track[] = [{ id: 'track-v1', kind: 'video', label: 'V1', order: 4, muted: false, locked: false, visible: true }]
    const normalized = ensureRequiredTracks(tracks)
    expect(normalized.map((track) => track.kind)).toEqual(['video', 'audio', 'image', 'overlay'])
    expect(normalized.map((track) => track.order)).toEqual([0, 1, 2, 3])
  })

  it('resolves deterministic default durations', () => {
    expect(resolveLibraryImportDurationSec('video')).toBe(5)
    expect(resolveLibraryImportDurationSec('image')).toBe(4)
    expect(resolveLibraryImportDurationSec('image', 0)).toBe(4)
    expect(resolveLibraryImportDurationSec('video', 2.5)).toBe(2.5)
  })

  it('routes imported media to dedicated lane kind', () => {
    const tracks = ensureRequiredTracks([])
    expect(resolveImportTrackId(tracks, 'video')).toBeTruthy()
    expect(resolveImportTrackId(tracks, 'image')).toBeTruthy()
    expect(resolveImportTrackId(tracks, 'image')).not.toEqual(resolveImportTrackId(tracks, 'video'))
  })
})
