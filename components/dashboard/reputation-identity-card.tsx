'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useScanIdentity } from '@/hooks/use-scan-identity'
import {
  EasyProModeToggle,
  type EasyProUiMode,
  type ConnectedMonetizationPlatform,
} from '@/components/ui/easy-pro-mode-toggle'
import { ONLYFANS_LOGO_SRC, FANSLY_LOGO_SRC } from '@/lib/platform-logos'
import { cn } from '@/lib/utils'

const IDENTITY_UI_MODE_KEY = 'mentions_identity_ui_mode'

type Props = {
  initialManualHandles: string[]
  initialDisplayName: string | null
  initialOnlyfans: string
  initialFansly: string
  initialFormerUsernames: string[]
}

function buildPlatformPayload(onlyfans: string, fansly: string): Record<string, string> | null {
  const out: Record<string, string> = {}
  const o = onlyfans.replace(/^@/, '').trim()
  const f = fansly.replace(/^@/, '').trim()
  if (o) out.onlyfans = o
  if (f) out.fansly = f
  return Object.keys(out).length ? out : null
}

export function ReputationIdentityCard({
  initialManualHandles,
  initialDisplayName,
  initialOnlyfans,
  initialFansly,
  initialFormerUsernames,
}: Props) {
  const router = useRouter()
  const { handles: identityRows, loading: identityLoading } = useScanIdentity()

  const [handles, setHandles] = useState(initialManualHandles.join(', '))
  const [former, setFormer] = useState(initialFormerUsernames.join(', '))
  const [displayName, setDisplayName] = useState(initialDisplayName ?? '')
  const [onlyfans, setOnlyfans] = useState(initialOnlyfans)
  const [fansly, setFansly] = useState(initialFansly)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uiMode, setUiModeState] = useState<EasyProUiMode>('easy')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const v = window.localStorage.getItem(IDENTITY_UI_MODE_KEY)
    if (v === 'pro' || v === 'easy') setUiModeState(v)
  }, [])

  const setUiMode = (mode: EasyProUiMode) => {
    setUiModeState(mode)
    if (typeof window !== 'undefined') window.localStorage.setItem(IDENTITY_UI_MODE_KEY, mode)
  }

  const connectedPlatforms = useMemo(() => {
    const s = new Set<ConnectedMonetizationPlatform>()
    for (const h of identityRows) {
      if (h.source === 'onlyfans') s.add('onlyfans')
      if (h.source === 'fansly') s.add('fansly')
    }
    return Array.from(s).sort((a, b) => {
      const o = { onlyfans: 0, fansly: 1 } as const
      return o[a] - o[b]
    })
  }, [identityRows])

  const onlyfansConnected = identityRows.some((h) => h.source === 'onlyfans')
  const fanslyConnected = identityRows.some((h) => h.source === 'fansly')

  /** Live usernames from `platform_connections` + scan-identity pipeline (OAuth / APIs). */
  const onlyfansSynced = useMemo(
    () => identityRows.find((h) => h.source === 'onlyfans')?.value ?? null,
    [identityRows],
  )
  const fanslySynced = useMemo(
    () => identityRows.find((h) => h.source === 'fansly')?.value ?? null,
    [identityRows],
  )

  const platformPayloadForPersist = (): Record<string, string> | null => {
    const ofVal = uiMode === 'easy' ? (onlyfansSynced ?? '').trim() : onlyfans.trim().replace(/^@/, '')
    const fsVal = uiMode === 'easy' ? (fanslySynced ?? '').trim() : fansly.trim().replace(/^@/, '')
    return buildPlatformPayload(ofVal, fsVal)
  }

  /** When switching from Easy → Pro, reload text fields from the server snapshot (manual overrides). */
  const prevUiMode = useRef(uiMode)
  useEffect(() => {
    if (prevUiMode.current === 'easy' && uiMode === 'pro') {
      setOnlyfans(initialOnlyfans)
      setFansly(initialFansly)
    }
    prevUiMode.current = uiMode
  }, [uiMode, initialOnlyfans, initialFansly])

  const parseCommaList = (raw: string) =>
    raw
      .split(/[,\n]+/)
      .map((s) => s.trim().replace(/^@/, ''))
      .filter(Boolean)

  const persist = async (body: {
    reputation_manual_handles: string[]
    reputation_display_name: string | null
    reputation_platform_handles: Record<string, string> | null
    former_usernames: string[]
  }) => {
    const res = await fetch('/api/social/reputation-identity', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'Could not save')
      return false
    }
    router.refresh()
    return true
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    const list = parseCommaList(handles)
    const formerList = parseCommaList(former)
    try {
      await persist({
        reputation_manual_handles: list,
        reputation_display_name: displayName.trim() || null,
        reputation_platform_handles: platformPayloadForPersist(),
        former_usernames: formerList,
      })
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      className={cn(
        'overflow-hidden rounded-[1.125rem]',
        'border border-border/45 bg-gradient-to-b from-muted/[0.22] to-transparent',
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]',
        'dark:border-white/[0.09] dark:from-muted/[0.12] dark:to-transparent',
      )}
      aria-labelledby="reputation-identity-heading"
    >
      <div className="flex flex-col gap-5 border-b border-border/[0.1] px-6 py-7 sm:flex-row sm:items-start sm:justify-between sm:gap-8 sm:px-8 sm:py-8 dark:border-white/[0.06]">
        <div className="min-w-0 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/85">Mentions</p>
          <h2 id="reputation-identity-heading" className="text-[1.25rem] font-semibold tracking-[-0.03em] text-foreground sm:text-[1.375rem]">
            Who to search for
          </h2>
          <p className="max-w-[44ch] text-[14px] leading-[1.55] tracking-[-0.01em] text-muted-foreground">
            {uiMode === 'easy' ? (
              <>
                In Easy mode we use @handles pulled from your integrations—no typing. Switch to Pro for display names,
                alternates, and extra identities.
              </>
            ) : (
              <>
                Linked accounts sync automatically; fields below refine or substitute when you&apos;re rebranding or
                juggling alternate @s.
              </>
            )}
          </p>
        </div>
        <EasyProModeToggle
          value={uiMode}
          onChange={setUiMode}
          ariaLabel="Identity fields detail level"
          connectedPlatforms={connectedPlatforms}
          className="shrink-0 sm:pt-1"
        />
      </div>

      <div className="space-y-8 px-6 py-7 sm:px-8 sm:py-8">
        {error ? (
          <p className="text-[13px] text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {(onlyfansConnected || fanslyConnected || uiMode === 'easy') ? (
          <div className="rounded-xl border border-border/[0.12] bg-background/[0.35] px-4 py-3.5 dark:border-white/[0.06] dark:bg-black/20">
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground/90">Integrations</span>{' '}
              {onlyfansConnected || fanslyConnected ? (
                <>
                  —{' '}
                  {[onlyfansConnected ? 'OnlyFans' : null, fanslyConnected ? 'Fansly' : null].filter(Boolean).join(' · ')}{' '}
                  {uiMode === 'easy' ? (
                    <>supply usernames via your connected APIs. </>
                  ) : (
                    <>supply live @handles—the fields below can override.</>
                  )}
                </>
              ) : (
                <>Connect OnlyFans · Fansly in </>
              )}
              {!onlyfansConnected && !fanslyConnected ? (
                <Link href="/dashboard/settings?tab=integrations" className="font-medium underline underline-offset-2">
                  Settings → Integrations
                </Link>
              ) : null}
              {!onlyfansConnected && !fanslyConnected ? '.' : null}
            </p>
          </div>
        ) : null}

        <div className="grid gap-7 sm:grid-cols-2 sm:gap-8">
          {uiMode === 'easy' ? (
            <>
              <div className="space-y-2">
                <img
                  src={ONLYFANS_LOGO_SRC}
                  alt="OnlyFans"
                  width={200}
                  height={48}
                  className="h-11 w-auto max-w-[min(220px,100%)] object-contain object-left sm:h-12"
                />
                <p className="text-[11.5px] leading-snug text-muted-foreground/88">
                  From integration {identityLoading ? '(loading…)' : ''}
                </p>
                {identityLoading ? (
                  <div
                    className="flex h-11 items-center rounded-xl border border-border/40 bg-background/60 px-3"
                    aria-busy="true"
                  >
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
                  </div>
                ) : onlyfansConnected && onlyfansSynced ? (
                  <div
                    className="flex h-11 items-center rounded-xl border border-border/45 bg-muted/[0.2] px-3.5 text-[14px] tabular-nums text-foreground dark:border-white/[0.08]"
                    role="status"
                  >
                    <span aria-hidden>@</span>
                    <span>{onlyfansSynced}</span>
                  </div>
                ) : onlyfansConnected && !onlyfansSynced ? (
                  <div className="rounded-xl border border-border/40 bg-background/50 px-3.5 py-2.5 text-[12px] leading-snug text-muted-foreground">
                    Connected—username will populate after integration sync completes.
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/45 px-3.5 py-2.5 text-[12px] leading-snug text-muted-foreground">
                    Not linked—{' '}
                    <Link href="/dashboard/settings?tab=integrations" className="font-medium underline underline-offset-2">
                      connect OnlyFans
                    </Link>{' '}
                    to ingest your username.
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <img
                  src={FANSLY_LOGO_SRC}
                  alt="Fansly"
                  width={200}
                  height={48}
                  className="h-11 w-auto max-w-[min(220px,100%)] object-contain object-left sm:h-12"
                />
                <p className="text-[11.5px] leading-snug text-muted-foreground/88">
                  From integration {identityLoading ? '(loading…)' : ''}
                </p>
                {identityLoading ? (
                  <div
                    className="flex h-11 items-center rounded-xl border border-border/40 bg-background/60 px-3"
                    aria-busy="true"
                  >
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
                  </div>
                ) : fanslyConnected && fanslySynced ? (
                  <div
                    className="flex h-11 items-center rounded-xl border border-border/45 bg-muted/[0.2] px-3.5 text-[14px] tabular-nums text-foreground dark:border-white/[0.08]"
                    role="status"
                  >
                    <span aria-hidden>@</span>
                    <span>{fanslySynced}</span>
                  </div>
                ) : fanslyConnected && !fanslySynced ? (
                  <div className="rounded-xl border border-border/40 bg-background/50 px-3.5 py-2.5 text-[12px] leading-snug text-muted-foreground">
                    Connected—username will populate after integration sync completes.
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/45 px-3.5 py-2.5 text-[12px] leading-snug text-muted-foreground">
                    Not linked—{' '}
                    <Link href="/dashboard/settings?tab=integrations" className="font-medium underline underline-offset-2">
                      connect Fansly
                    </Link>{' '}
                    to ingest your username.
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <img
                  src={ONLYFANS_LOGO_SRC}
                  alt="OnlyFans"
                  width={200}
                  height={48}
                  className="h-11 w-auto max-w-[min(220px,100%)] object-contain object-left sm:h-12"
                />
                <Label htmlFor="rep-of" className="sr-only">
                  OnlyFans{!onlyfansConnected ? ', optional username override' : ''}
                </Label>
                {!onlyfansConnected ? (
                  <p className="text-[11px] font-normal text-muted-foreground">Optional override</p>
                ) : null}
                {onlyfansConnected ? (
                  <p className="text-[11.5px] leading-snug text-muted-foreground/88">
                    Alternate or legacy @ if different from Integration.
                  </p>
                ) : (
                  <p className="text-[11.5px] leading-snug text-muted-foreground/88">Username without @</p>
                )}
                <Input
                  id="rep-of"
                  value={onlyfans}
                  className={cn(
                    'h-11 rounded-xl border-border/55 bg-background/75 text-[14px] shadow-none',
                    onlyfansConnected && 'border-dashed border-border/50',
                  )}
                  placeholder={onlyfansConnected ? 'Alternate or legacy username' : 'Your @handle without @'}
                  onChange={(e) => setOnlyfans(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <img
                  src={FANSLY_LOGO_SRC}
                  alt="Fansly"
                  width={200}
                  height={48}
                  className="h-11 w-auto max-w-[min(220px,100%)] object-contain object-left sm:h-12"
                />
                <Label htmlFor="rep-fs" className="sr-only">
                  Fansly{!fanslyConnected ? ', optional username override' : ''}
                </Label>
                {!fanslyConnected ? (
                  <p className="text-[11px] font-normal text-muted-foreground">Optional override</p>
                ) : null}
                {fanslyConnected ? (
                  <p className="text-[11.5px] leading-snug text-muted-foreground/88">
                    Alternate or legacy @ if different from Integration.
                  </p>
                ) : (
                  <p className="text-[11.5px] leading-snug text-muted-foreground/88">Username without @</p>
                )}
                <Input
                  id="rep-fs"
                  value={fansly}
                  className={cn(
                    'h-11 rounded-xl border-border/55 bg-background/75 text-[14px] shadow-none',
                    fanslyConnected && 'border-dashed border-border/50',
                  )}
                  placeholder={fanslyConnected ? 'Alternate or legacy username' : 'Your @handle without @'}
                  onChange={(e) => setFansly(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </>
          )}
        </div>

        {uiMode === 'pro' ? (
          <div className="space-y-8">
            <div className="space-y-2">
              <Label htmlFor="rep-display" className="text-[12.5px] font-medium tracking-tight text-foreground/92">
                Display name <span className="font-normal text-muted-foreground/78">optional</span>
              </Label>
              <Input
                id="rep-display"
                placeholder="Stage or legal name for broader discovery"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-11 rounded-xl border-border/55 bg-background/75 text-[14px] shadow-none"
              />
            </div>

            <div className="space-y-6 border-t border-border/[0.1] pt-8 dark:border-white/[0.06]">
              <div className="space-y-2">
                <Label htmlFor="rep-handles" className="text-[12.5px] font-medium tracking-tight text-foreground/92">
                  Extra @handles & brands
                </Label>
                <p className="text-[11.5px] leading-relaxed text-muted-foreground/88">
                  Comma-separated — agency names, stage names, or socials beyond OF / Fansly.
                </p>
                <Input
                  id="rep-handles"
                  placeholder="studio_name, persona_name, nickname"
                  value={handles}
                  onChange={(e) => setHandles(e.target.value)}
                  className="min-h-[2.75rem] rounded-xl border-border/55 bg-background/75 py-2 text-[14px] shadow-none sm:min-h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rep-former" className="text-[12.5px] font-medium tracking-tight text-foreground/92">
                  Former @s & rebrands
                </Label>
                <p className="text-[11.5px] leading-relaxed text-muted-foreground/88">
                  Old usernames to keep in recall when content still references prior handles.
                </p>
                <Input
                  id="rep-former"
                  placeholder="old_handle, previous_brand"
                  value={former}
                  onChange={(e) => setFormer(e.target.value)}
                  className="min-h-[2.75rem] rounded-xl border-border/55 bg-background/75 py-2 text-[14px] shadow-none sm:min-h-11"
                />
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 border-t border-border/[0.1] pt-7 dark:border-white/[0.06]">
          <Button
            type="button"
            className="h-11 rounded-xl bg-foreground px-6 text-[13px] font-medium text-background hover:bg-foreground/88"
            onClick={() => void save()}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Save
          </Button>
          {uiMode === 'pro' ? (
            <Button
              type="button"
              variant="ghost"
              className="h-11 rounded-xl px-3 text-[13px] font-medium text-muted-foreground hover:text-foreground"
              onClick={async () => {
                setHandles('')
                setFormer('')
                setDisplayName('')
                setOnlyfans('')
                setFansly('')
                setSaving(true)
                setError(null)
                try {
                  const ok = await persist({
                    reputation_manual_handles: [],
                    reputation_display_name: null,
                    reputation_platform_handles: null,
                    former_usernames: [],
                  })
                  if (!ok) return
                  if (typeof window !== 'undefined') {
                    window.localStorage.removeItem('mentions_selected_handles')
                  }
                } catch {
                  setError('Network error')
                } finally {
                  setSaving(false)
                }
              }}
              disabled={saving}
            >
              Clear all
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
