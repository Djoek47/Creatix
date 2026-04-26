'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { MarkitSeal } from '@/components/markit/markit-seal'
import { FRAME_PROJECT_DRAFT_KEY } from '@/lib/frame/timeline/defaults'
import { deserializeProjectState } from '@/lib/frame/timeline/serialize'
import type { ProjectState } from '@/lib/frame/timeline/types'

type LibraryKind = 'video' | 'image'
type LibraryFilter = 'all' | 'video' | 'image' | 'traced' | 'hot'
type LibrarySort = 'recent' | 'oldest' | 'intense' | 'duration' | 'name'

type LibraryItem = {
  id: string
  name: string
  kind: LibraryKind
  importedAt: number
  durationSec?: number
  resolution: string
  traced: number
  intensity: number[]
  hasClimax: boolean
}

type RenderLikeRun = {
  recipientKey: string
  focusedClipId?: string
  focusedClipName?: string
  status?: string
}

function buildIntensitySeed(seedSource: string): number[] {
  let hash = 0
  for (let i = 0; i < seedSource.length; i++) {
    hash = (hash * 31 + seedSource.charCodeAt(i)) | 0
  }
  const values = Array.from({ length: 10 }, (_, idx) => {
    const shifted = Math.abs((hash >> (idx % 8)) + idx * 17) % 100
    return Math.max(0.08, Math.min(0.9, shifted / 100))
  })
  return values
}

function loadTraceCounts(): { byId: Map<string, number>; byName: Map<string, number> } {
  const byId = new Map<string, number>()
  const byName = new Map<string, number>()
  if (typeof window === 'undefined') return { byId, byName }
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key) continue
      if (!key.startsWith('frame-editor:trace-runs:v1:') && !key.startsWith('frame-editor:render-runs:v1:')) continue
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw) as RenderLikeRun[]
      if (!Array.isArray(parsed)) continue
      for (const run of parsed) {
        if (run.status && run.status === 'error') continue
        if (run.focusedClipId) byId.set(run.focusedClipId, (byId.get(run.focusedClipId) || 0) + 1)
        if (run.focusedClipName) byName.set(run.focusedClipName, (byName.get(run.focusedClipName) || 0) + 1)
      }
    }
  } catch {
    // best-effort local cache read
  }
  return { byId, byName }
}

function loadDraftLibraryItems(): LibraryItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(FRAME_PROJECT_DRAFT_KEY)
    if (!raw) return []
    const project = deserializeProjectState(raw) as ProjectState
    const traceCounts = loadTraceCounts()
    return project.media
      .filter((media) => media.kind === 'video' || media.kind === 'image')
      .map((media) => {
        const intensity = buildIntensitySeed(media.id || media.name)
        const peak = Math.max(...intensity)
        return {
          id: media.id,
          name: media.name,
          kind: media.kind === 'video' ? 'video' : 'image',
          importedAt: Date.parse(media.importedAt) || Date.now(),
          durationSec: media.durationSec,
          resolution: `${media.width}x${media.height}`,
          traced:
            traceCounts.byId.get(media.id) ||
            traceCounts.byName.get(media.name) ||
            (media.contentId ? 1 : 0),
          intensity,
          hasClimax: peak > 0.72,
        } satisfies LibraryItem
      })
  } catch {
    return []
  }
}

function relTime(ts: number): string {
  const delta = Date.now() - ts
  if (delta < 60_000) return 'just now'
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`
  return `${Math.floor(delta / 86_400_000)}d ago`
}

function bucketFor(ts: number): string {
  const age = Date.now() - ts
  const day = 24 * 60 * 60 * 1000
  if (age < day) return 'Today'
  if (age < 2 * day) return 'Yesterday'
  if (age < 7 * day) return 'This week'
  if (age < 30 * day) return 'This month'
  return 'Older'
}

function formatDuration(sec?: number): string {
  if (!sec) return '0:00'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<LibraryFilter>('all')
  const [sort, setSort] = useState<LibrarySort>('recent')

  useEffect(() => {
    const hydrated = loadDraftLibraryItems()
    setItems(hydrated)
  }, [])

  const visible = useMemo(() => {
    let list = items.slice()
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((item) => item.name.toLowerCase().includes(q))
    }
    if (filter === 'video') list = list.filter((item) => item.kind === 'video')
    if (filter === 'image') list = list.filter((item) => item.kind === 'image')
    if (filter === 'traced') list = list.filter((item) => item.traced > 0)
    if (filter === 'hot') list = list.filter((item) => item.hasClimax)

    if (sort === 'oldest') list.sort((a, b) => a.importedAt - b.importedAt)
    if (sort === 'duration') list.sort((a, b) => (b.durationSec || 0) - (a.durationSec || 0))
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'intense') {
      list.sort((a, b) => Math.max(...b.intensity) - Math.max(...a.intensity))
    }
    if (sort === 'recent') list.sort((a, b) => b.importedAt - a.importedAt)

    return list
  }, [filter, items, search, sort])

  const grouped = useMemo(() => {
    const map = new Map<string, LibraryItem[]>()
    for (const item of visible) {
      const key = bucketFor(item.importedAt)
      const curr = map.get(key) || []
      curr.push(item)
      map.set(key, curr)
    }
    return Array.from(map.entries())
  }, [visible])

  const toggleSelection = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]))
  }

  const onUploadStub = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    const additions: LibraryItem[] = Array.from(files).map((file, idx) => {
      const kind: LibraryKind = file.type.startsWith('video') ? 'video' : 'image'
      return {
        id: `upl_${Date.now()}_${idx}`,
        name: file.name,
        kind,
        importedAt: Date.now(),
        durationSec: kind === 'video' ? 24 : undefined,
        resolution: kind === 'video' ? '1080x1920' : '2048x2048',
        traced: 0,
        intensity: [0.08, 0.11, 0.14, 0.18, 0.2, 0.24, 0.2, 0.16, 0.12, 0.1],
        hasClimax: false,
      }
    })
    setItems((prev) => [...additions, ...prev])
    event.target.value = ''
  }

  const persistSelectionForEditor = () => {
    const selectedItems = items
      .filter((item) => selected.includes(item.id))
      .map((item) => ({
        id: item.id,
        kind: item.kind,
        name: item.name,
        resolution: item.resolution,
        durationSec: item.durationSec,
      }))
    if (selectedItems.length === 0) return
    try {
      window.sessionStorage.setItem(
        'markit:selection:v1',
        JSON.stringify({ ids: selectedItems.map((item) => item.id), items: selectedItems, timestamp: Date.now() }),
      )
    } catch {
      // non-blocking in environments where storage is unavailable
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <MarkitSeal size={30} />
            <div>
              <p className="font-serif-display text-sm tracking-[0.2em]">MARKIT · LIBRARY</p>
              <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.15em]">Beta</p>
            </div>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/vault" className="rounded-full border px-4 py-2" style={{ borderColor: 'var(--border)' }}>
              Vault
            </Link>
            <Link href="/editor/simple" className="rounded-full border px-4 py-2" style={{ borderColor: 'var(--border)' }}>
              Editor Simple
            </Link>
            <Link href="/editor/pro" className="rounded-full bg-[var(--primary)] px-4 py-2 text-[var(--primary-foreground)]">
              Editor Pro
            </Link>
          </nav>
        </div>
      </header>

      <div className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search clips by name..."
            className="w-full rounded-full border bg-[var(--card)] px-4 py-2 text-sm sm:w-72"
            style={{ borderColor: 'var(--border)' }}
          />
          <div className="flex flex-wrap gap-2">
            {[
              ['all', 'All'],
              ['video', 'Video'],
              ['image', 'Image'],
              ['traced', 'Traced'],
              ['hot', 'Hot'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id as LibraryFilter)}
                className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
                  filter === id ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : 'text-muted-foreground'
                }`}
                style={{ borderColor: filter === id ? 'var(--primary)' : 'var(--border)' }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as LibrarySort)}
              className="rounded-md border bg-[var(--card)] px-3 py-2 font-mono text-xs"
              style={{ borderColor: 'var(--border)' }}
            >
              <option value="recent">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="intense">Most intense</option>
              <option value="duration">Longest</option>
              <option value="name">Name A-Z</option>
            </select>
            <label
              className="cursor-pointer rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-foreground)]"
              htmlFor="library-upload"
            >
              Upload
            </label>
            <input id="library-upload" type="file" accept="image/*,video/*" multiple className="hidden" onChange={onUploadStub} />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 pb-28">
        {items.length === 0 ? (
          <section className="flex min-h-[420px] flex-col items-center justify-center text-center">
            <MarkitSeal size={104} />
            <h2 className="font-serif-display mt-6 text-3xl">
              Your <em className="text-[var(--primary)]">library</em> is empty.
            </h2>
            <p className="text-muted-foreground mt-3 max-w-md text-sm">
              Upload your raw clips and pictures. We will scan intensity and prep them for one-tap editing.
            </p>
          </section>
        ) : visible.length === 0 ? (
          <section className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: 'var(--border)' }}>
            <p className="text-muted-foreground text-sm">No clips match your current filter.</p>
          </section>
        ) : (
          grouped.map(([label, group]) => (
            <section key={label} className="mb-8">
              <p className="text-muted-foreground mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.24em]">
                {label}
                <span className="text-[var(--primary)]">{group.length}</span>
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.map((item) => {
                  const isSelected = selected.includes(item.id)
                  const peak = Math.max(...item.intensity)
                  return (
                    <article
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleSelection(item.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') toggleSelection(item.id)
                      }}
                      className={`rounded-xl border bg-[var(--card)] transition hover:-translate-y-0.5 ${
                        isSelected ? 'shadow-[0_0_0_2px_color-mix(in_oklch,var(--primary)_34%,transparent)]' : ''
                      }`}
                      style={{ borderColor: isSelected ? 'var(--primary)' : 'var(--border)' }}
                    >
                      <div className="relative aspect-video bg-gradient-to-br from-[oklch(0.18_0.02_285)] to-[oklch(0.10_0.01_285)] p-3">
                        <div className="absolute left-3 top-3 rounded-md border border-white/70 bg-black/45 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]">
                          {item.kind === 'video' ? 'vid' : 'img'}
                        </div>
                        {item.durationSec ? (
                          <div className="absolute right-3 top-3 rounded-md bg-black/55 px-2 py-1 font-mono text-[10px]">
                            {formatDuration(item.durationSec)}
                          </div>
                        ) : null}
                        {item.traced > 0 ? (
                          <div className="absolute bottom-7 right-3 rounded-full bg-[var(--primary)] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--primary-foreground)]">
                            traced x{item.traced}
                          </div>
                        ) : null}
                        <div className="absolute inset-x-0 bottom-0 flex h-5 items-end gap-0.5 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1">
                          {item.intensity.map((v, idx) => {
                            const barHeight = Math.max(2, Math.floor(v * 12))
                            const isPeak = v === peak
                            const isClimax = item.hasClimax && isPeak
                            return (
                              <span
                                key={`${item.id}_${idx}`}
                                className={isClimax ? 'bg-red-400' : isPeak ? 'bg-[var(--primary)]' : 'bg-yellow-200/60'}
                                style={{ height: `${barHeight}px`, flex: 1, borderRadius: '1px' }}
                              />
                            )
                          })}
                        </div>
                      </div>
                      <div className="space-y-1 px-3 py-3">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-muted-foreground flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.08em]">
                          <span>{item.resolution}</span>
                          <span>{relTime(item.importedAt)}</span>
                          {item.hasClimax ? <span className="text-[var(--primary)]">peak</span> : null}
                        </p>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t bg-[color-mix(in_oklch,var(--background)_86%,transparent)] backdrop-blur" style={{ borderColor: 'var(--border)' }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
          <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.18em]">
            <span className="text-[var(--primary)]">Ready</span> · {items.length} item{items.length === 1 ? '' : 's'}
          </p>
          <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.18em]">Trace engine v2 · Markit beta</p>
        </div>
      </footer>

      <div
        className={`fixed bottom-12 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full border px-4 py-2 shadow-2xl transition ${
          selected.length > 0 ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-16 opacity-0'
        }`}
        style={{ borderColor: 'var(--primary)', background: 'var(--card)' }}
      >
        <p className="font-serif-display text-sm">
          <strong>{selected.length}</strong> selected
        </p>
        <button
          type="button"
          onClick={() => setSelected([])}
          className="text-muted-foreground rounded-full border px-3 py-1 text-xs"
          style={{ borderColor: 'var(--border)' }}
        >
          Clear
        </button>
        <Link
          href="/editor/simple?from=library"
          onClick={persistSelectionForEditor}
          className="rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-foreground)]"
        >
          Create with AI
        </Link>
      </div>
    </div>
  )
}
