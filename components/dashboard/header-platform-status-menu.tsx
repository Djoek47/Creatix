'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2, Settings2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import {
  CREATOR_STATUS_PRESETS,
  normalizeCreatorStatusDetail,
  normalizeCreatorStatusPreset,
  type CreatorStatusPreset,
} from '@/lib/creator-platform-status'
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC, MANYVIDS_LOGO_SRC } from '@/lib/platform-logos'

type Row = {
  platform: string
  creator_status_preset: string | null
  creator_status_detail: string | null
}

type Draft = { preset: CreatorStatusPreset; detail: string }

const PLATFORM_UI: Record<string, { label: string; logoSrc?: string }> = {
  onlyfans: { label: 'OnlyFans', logoSrc: ONLYFANS_LOGO_SRC },
  fansly: { label: 'Fansly', logoSrc: FANSLY_LOGO_SRC },
  manyvids: { label: 'ManyVids', logoSrc: MANYVIDS_LOGO_SRC },
}

function draftFromRow(row: Row): Draft {
  return {
    preset: normalizeCreatorStatusPreset(row.creator_status_preset),
    detail: normalizeCreatorStatusDetail(row.creator_status_detail) ?? '',
  }
}

function translateCreatorStatusPreset(
  preset: CreatorStatusPreset,
  t: ReturnType<typeof useTranslations<'dashboard'>>,
): string {
  switch (preset) {
    case 'available':
      return t('platformStatus.presets.available')
    case 'away':
      return t('platformStatus.presets.away')
    case 'busy':
      return t('platformStatus.presets.busy')
    case 'dnd':
      return t('platformStatus.presets.dnd')
    case 'custom':
      return t('platformStatus.presets.custom')
    default:
      return preset
  }
}

/** Mirrors `formatCreatorStatusLabel` using translated preset labels (DB preset enums unchanged). */
function formatHeaderCreatorStatusPreview(
  presetValue: unknown,
  detailValue: unknown,
  t: ReturnType<typeof useTranslations<'dashboard'>>,
): string | null {
  const preset = normalizeCreatorStatusPreset(presetValue)
  const detail = normalizeCreatorStatusDetail(detailValue)
  const presetLabel = translateCreatorStatusPreset(preset, t)

  if (preset === 'custom') {
    return detail ?? t('platformStatus.customFallback')
  }

  return detail ? t('platformStatus.previewWithDetail', { preset: presetLabel, detail }) : presetLabel
}

export function HeaderPlatformStatusMenuSection() {
  const t = useTranslations('dashboard')
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
      if (list.some((row) => row.platform === 'manyvids')) return 'manyvids'
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
          setError(e instanceof Error ? e.message : t('platformStatus.errorLoad'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [load, t])

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
      setError(t('platformStatus.errorCustomDetail'))
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
      setError(e instanceof Error ? e.message : t('platformStatus.errorSave'))
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
      <DropdownMenuLabel className="px-3.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground/75">
        {t('platformStatus.sectionTitle')}
      </DropdownMenuLabel>
      <div
        className="flex cursor-default flex-col items-stretch gap-3 rounded-xl px-2 pb-2 pt-0.5"
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2.5 py-5 text-[13px] font-normal text-muted-foreground/80">
            <Loader2 className="size-4 shrink-0 animate-spin opacity-65" aria-hidden />
            <span>{t('platformStatus.loading')}</span>
          </div>
        ) : rows.length === 0 ? (
          <p className="px-1.5 py-2 text-[12px] leading-relaxed text-muted-foreground/88">
            {t('platformStatus.emptyLead')}
            <Link
              href="/dashboard/settings?tab=integrations"
              className="font-medium text-foreground/75 underline decoration-border/50 underline-offset-4 transition-colors hover:text-foreground"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {t('platformStatus.connectInSettings')}
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
                        <img src={ui.logoSrc} alt="" className="h-4 w-auto max-w-[4rem] shrink-0 object-contain object-left" />
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
              }
              const draft = drafts[row.platform] ?? draftFromRow(row)
              const isCustom = draft.preset === 'custom'
              const busy = saving[row.platform] === true
              const preview = formatHeaderCreatorStatusPreview(draft.preset, draft.detail, t)

              return (
                <div
                  key={row.platform}
                  className="rounded-xl border border-border/30 bg-muted/20 p-2.5 dark:border-white/[0.06] dark:bg-muted/15"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="mb-2 flex items-center gap-2">
                    {ui.logoSrc ? (
                      <img src={ui.logoSrc} alt="" className="h-5 w-auto max-w-[4.5rem] shrink-0 object-contain object-left" />
                    ) : (
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/45 bg-background/80 text-[10px] font-semibold text-muted-foreground"
                        aria-hidden
                      >
                        {ui.label.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold leading-tight tracking-tight text-foreground/92">
                        {ui.label}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground/85">{preview ?? '—'}</p>
                    </div>
                  </div>
                  <label className="sr-only" htmlFor={`header-status-preset-${row.platform}`}>
                    {t('platformStatus.srPreset', { platform: ui.label })}
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
                        {translateCreatorStatusPreset(p, t)}
                      </option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor={`header-status-detail-${row.platform}`}>
                    {t('platformStatus.srDetail', { platform: ui.label })}
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
                      isCustom ? t('platformStatus.placeholderCustom') : t('platformStatus.placeholderOptional')
                    }
                    className="mb-2 h-8 text-xs"
                    disabled={busy}
                    maxLength={120}
                  />
                  {isCustom ? (
                    <p className="mb-2 text-[11px] text-muted-foreground/88">
                      {t('platformStatus.customTemplatesLead')}
                      <Link
                        href="/dashboard/settings?tab=integrations"
                        className="font-medium text-foreground/75 underline decoration-border/45 underline-offset-3 transition-colors hover:text-foreground"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        {t('platformStatus.settingsIntegrationsPhrase')}
                      </Link>
                      {t('platformStatus.customTemplatesTrail')}
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
                      {t('platformStatus.save')}
                    </Button>
                  </div>
                </div>
              )
            })() : null}
            <p className="text-[11px] leading-snug text-muted-foreground/85">
              {t('platformStatus.footnoteLead')}
              <Link
                href="/dashboard/settings?tab=integrations"
                className="font-medium text-foreground/75 underline decoration-border/45 underline-offset-3 transition-colors hover:text-foreground"
                onPointerDown={(e) => e.stopPropagation()}
              >
                {t('platformStatus.settingsIntegrationsPhrase')}
              </Link>
              {t('platformStatus.footnoteTrail')}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
