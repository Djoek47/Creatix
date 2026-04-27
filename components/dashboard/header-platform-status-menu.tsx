'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Settings2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import {
  CREATOR_STATUS_PRESETS,
  formatCreatorStatusLabel,
  getCreatorStatusPresetLabel,
  normalizeCreatorStatusDetail,
  normalizeCreatorStatusPreset,
  type CreatorStatusPreset,
} from '@/lib/creator-platform-status'

type Row = {
  platform: string
  creator_status_preset: string | null
  creator_status_detail: string | null
}

type Draft = { preset: CreatorStatusPreset; detail: string }

const PLATFORM_UI: Record<
  string,
  { label: string; logoSrc?: string; accent: string }
> = {
  onlyfans: { label: 'OnlyFans', logoSrc: '/onlyfans-logo.png', accent: '#00AFF0' },
  fansly: { label: 'Fansly', logoSrc: '/fansly-logo.png', accent: '#009FFF' },
}

function draftFromRow(row: Row): Draft {
  return {
    preset: normalizeCreatorStatusPreset(row.creator_status_preset),
    detail: normalizeCreatorStatusDetail(row.creator_status_detail) ?? '',
  }
}

export function HeaderPlatformStatusMenuSection() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [activePlatform, setActivePlatform] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const detailInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const load = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setRows([])
      setDrafts({})
      return
    }
    const { data, error: qErr } = await supabase
      .from('platform_connections')
      .select('platform, creator_status_preset, creator_status_detail')
      .eq('user_id', user.id)
      .eq('is_connected', true)
    if (qErr) throw new Error(qErr.message)
    const list = (data ?? [])
      .map((r) => ({
        platform: String((r as { platform?: string }).platform ?? ''),
        creator_status_preset: (r as { creator_status_preset?: string | null }).creator_status_preset ?? null,
        creator_status_detail: (r as { creator_status_detail?: string | null }).creator_status_detail ?? null,
      }))
      .filter((r) => r.platform.length > 0)
    setRows(list)
    const nextDrafts: Record<string, Draft> = {}
    for (const row of list) {
      nextDrafts[row.platform] = draftFromRow(row)
    }
    setDrafts(nextDrafts)
    setActivePlatform((prev) => {
      if (prev && list.some((row) => row.platform === prev)) return prev
      if (list.some((row) => row.platform === 'onlyfans')) return 'onlyfans'
      if (list.some((row) => row.platform === 'fansly')) return 'fansly'
      return list[0]?.platform ?? null
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        await load()
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load platforms')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [load])

  const patchDraft = (platform: string, patch: Partial<Draft>) => {
    setDrafts((prev) => {
      const base = prev[platform] ?? { preset: 'available' as const, detail: '' }
      return { ...prev, [platform]: { ...base, ...patch } }
    })
  }

  const save = async (platform: string) => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const draft = drafts[platform] ?? { preset: 'available' as const, detail: '' }
    const preset = normalizeCreatorStatusPreset(draft.preset)
    const detail = normalizeCreatorStatusDetail(draft.detail)
    if (preset === 'custom' && !detail) {
      setError('Custom status needs a short message.')
      return
    }
    setError(null)
    setSaving((s) => ({ ...s, [platform]: true }))
    try {
      const { error: upErr } = await supabase
        .from('platform_connections')
        .update({
          creator_status_preset: preset,
          creator_status_detail: detail,
        })
        .eq('user_id', user.id)
        .eq('platform', platform)
        .eq('is_connected', true)
      if (upErr) throw new Error(upErr.message)
      await load()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving((s) => ({ ...s, [platform]: false }))
    }
  }

  const editableRow = useMemo(() => {
    if (!rows.length) return null
    if (activePlatform) {
      const selected = rows.find((row) => row.platform === activePlatform)
      if (selected) return selected
    }
    return rows[0]
  }, [activePlatform, rows])

  return (
    <>
      <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
        Platform status
      </DropdownMenuLabel>
      <div
        className="flex cursor-default flex-col items-stretch gap-3 rounded-md px-2 py-2.5"
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span className="text-xs">Loading connections…</span>
          </div>
        ) : rows.length === 0 ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">
            No connected platforms.{' '}
            <Link
              href="/dashboard/settings?tab=integrations"
              className="font-medium text-primary underline-offset-2 hover:underline"
              onPointerDown={(e) => e.stopPropagation()}
            >
              Connect in Settings
            </Link>
          </p>
        ) : (
          <div
            className="flex max-h-[min(50vh,22rem)] flex-col gap-3 overflow-y-auto pr-0.5"
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
                {error}
              </p>
            ) : null}
            {rows.length > 1 ? (
              <div className="flex items-center gap-1.5">
                {rows.map((row) => {
                  const ui = PLATFORM_UI[row.platform] ?? {
                    label: row.platform.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                    accent: 'var(--primary)',
                  }
                  const isActive = (activePlatform ?? editableRow?.platform) === row.platform
                  return (
                    <Button
                      key={`switch-${row.platform}`}
                      type="button"
                      size="sm"
                      variant={isActive ? 'secondary' : 'ghost'}
                      className="h-8 gap-1.5 px-2 text-[11px]"
                      onClick={() => setActivePlatform(row.platform)}
                    >
                      {ui.logoSrc ? (
                        <img src={ui.logoSrc} alt="" className="h-4 w-4 shrink-0 object-contain" />
                      ) : (
                        <span className="text-[10px] font-semibold">{ui.label.slice(0, 2).toUpperCase()}</span>
                      )}
                      {ui.label}
                    </Button>
                  )
                })}
              </div>
            ) : null}

            {editableRow ? (() => {
              const row = editableRow
              const ui = PLATFORM_UI[row.platform] ?? {
                label: row.platform.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                accent: 'var(--primary)',
              }
              const draft = drafts[row.platform] ?? draftFromRow(row)
              const isCustom = draft.preset === 'custom'
              const busy = saving[row.platform] === true
              const preview = formatCreatorStatusLabel(draft.preset, draft.detail)

              return (
                <div
                  key={row.platform}
                  className="rounded-lg border border-border/70 bg-muted/15 p-2.5 shadow-xs"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="mb-2 flex items-center gap-2">
                    {ui.logoSrc ? (
                      <img src={ui.logoSrc} alt="" className="h-5 w-5 shrink-0 object-contain" />
                    ) : (
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background text-[10px] font-bold text-muted-foreground"
                        aria-hidden
                      >
                        {ui.label.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold leading-tight" style={{ color: ui.accent }}>
                        {ui.label}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">{preview ?? '—'}</p>
                    </div>
                  </div>
                  <label className="sr-only" htmlFor={`header-status-preset-${row.platform}`}>
                    Status preset for {ui.label}
                  </label>
                  <select
                    id={`header-status-preset-${row.platform}`}
                    className="mb-1.5 h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground shadow-xs outline-none [color-scheme:light] focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50 dark:[color-scheme:dark]"
                    value={draft.preset}
                    disabled={busy}
                    onChange={(e) => {
                      const nextPreset = normalizeCreatorStatusPreset(e.target.value)
                      patchDraft(row.platform, { preset: nextPreset })
                      if (nextPreset === 'custom') {
                        setTimeout(() => {
                          detailInputRefs.current[row.platform]?.focus()
                        }, 0)
                      }
                    }}
                  >
                    {CREATOR_STATUS_PRESETS.map((p) => (
                      <option key={p} value={p}>
                        {getCreatorStatusPresetLabel(p)}
                      </option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor={`header-status-detail-${row.platform}`}>
                    Optional status detail for {ui.label}
                  </label>
                  <Input
                    id={`header-status-detail-${row.platform}`}
                    ref={(node) => {
                      detailInputRefs.current[row.platform] = node
                    }}
                    value={draft.detail}
                    onChange={(e) =>
                      patchDraft(row.platform, { detail: e.target.value.slice(0, 120) })
                    }
                    placeholder={
                      isCustom ? 'Custom message (required)' : 'Optional note (e.g. back at 6pm)'
                    }
                    className="mb-2 h-8 text-xs"
                    disabled={busy}
                    maxLength={120}
                  />
                  {isCustom ? (
                    <p className="mb-2 text-[11px] text-muted-foreground">
                      Save custom note templates in{' '}
                      <Link
                        href="/dashboard/settings?tab=integrations"
                        className="font-medium text-primary underline-offset-2 hover:underline"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        Settings → Integrations
                      </Link>
                      .
                    </p>
                  ) : null}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 gap-1 px-2 text-[11px]"
                      disabled={busy || (isCustom && !draft.detail.trim())}
                      onClick={() => void save(row.platform)}
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Settings2 className="h-3.5 w-3.5" aria-hidden />
                      )}
                      Save
                    </Button>
                  </div>
                </div>
              )
            })() : null}
            <p className="text-[11px] leading-snug text-muted-foreground">
              More options in{' '}
              <Link
                href="/dashboard/settings?tab=integrations"
                className="font-medium text-primary underline-offset-2 hover:underline"
                onPointerDown={(e) => e.stopPropagation()}
              >
                Settings → Integrations
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </>
  )
}
