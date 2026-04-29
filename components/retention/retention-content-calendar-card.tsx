'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format, isSameDay, isValid, parseISO, startOfDay, startOfMonth } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useCreditInsufficientModal } from '@/components/billing/credit-insufficient-modal-context'
import { useCreditSnapshot } from '@/hooks/use-credit-snapshot'
import {
  parseCalendarTeaserStored,
  serializeCalendarTeaserStored,
} from '@/lib/circe-churn/calendar-teaser-notes-format'
import { Loader2, Calendar as CalendarIcon, Plus, X, ScanLine, Coins } from 'lucide-react'
import type { CirceChurnSettingsRow } from '@/lib/circe-churn/run-for-user'
import { toast } from '@/hooks/use-toast'
import Link from 'next/link'

type TeaserRow = { id: string; date: Date | undefined; text: string }

const MAX_CAL_TEASER_ROWS = 24

/** Stable day key for matching planned rows to calendar modifiers. */
function dayKey(d: Date): string {
  return format(startOfDay(d), 'yyyy-MM-dd')
}

const surfaceCard =
  'rounded-2xl border border-border/35 bg-card/60 shadow-none backdrop-blur-sm dark:border-border/25 dark:bg-card/45'

const sectionKicker = 'text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/75'

export function RetentionContentCalendarCard({
  showScanActions = true,
  className,
}: {
  /** When false, only Save for calendar fields is shown (e.g. embedded in a longer flow). */
  showScanActions?: boolean
  className?: string
}) {
  const { wallet, loading: creditsLoading, refresh: refreshCredits } = useCreditSnapshot()
  const { openCreditInsufficientModal } = useCreditInsufficientModal()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [creditsPerRun, setCreditsPerRun] = useState(2)

  const [teaseFutureContent, setTeaseFutureContent] = useState(true)
  const [teaserRows, setTeaserRows] = useState<TeaserRow[]>(() => [
    { id: crypto.randomUUID(), date: undefined, text: '' },
  ])

  /** Month shown in the embedded picker (distinct from inline row popovers). */
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => startOfMonth(new Date()))
  /** Last day focused from the embedded month grid — highlights row + calendar cell. */
  const [embeddedSelection, setEmbeddedSelection] = useState<Date | undefined>(undefined)
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null)
  const rowAnchorsRef = useRef<Map<string, HTMLDivElement | null>>(new Map())

  const plannedDatesForModifiers = useMemo(() => {
    const seen = new Set<string>()
    const out: Date[] = []
    for (const r of teaserRows) {
      if (!r.date || !isValid(r.date)) continue
      const k = dayKey(r.date)
      if (seen.has(k)) continue
      seen.add(k)
      out.push(startOfDay(r.date))
    }
    return out
  }, [teaserRows])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/circe-churn/settings')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not load settings')
        return
      }
      const s = data.settings as CirceChurnSettingsRow
      setTeaseFutureContent(s.tease_future_content !== false)
      setCreditsPerRun(Math.min(10, Math.max(1, Math.round(Number(s.credits_per_run ?? 2)))))
      const lines = parseCalendarTeaserStored(s.calendar_teaser_notes)
      setTeaserRows(
        lines.length > 0
          ? lines.map((l) => {
              let date: Date | undefined
              if (l.date) {
                const d = parseISO(l.date)
                date = isValid(d) ? d : undefined
              }
              return { id: crypto.randomUUID(), date, text: l.text }
            })
          : [{ id: crypto.randomUUID(), date: undefined, text: '' }],
      )
    } catch {
      setError('Could not load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const serializedCalendarTeasers = serializeCalendarTeaserStored(
    teaserRows.map((r) => ({
      date: r.date ? format(r.date, 'yyyy-MM-dd') : '',
      text: r.text,
    })),
  )

  const patchTeaserRow = useCallback((id: string, patch: Partial<Pick<TeaserRow, 'date' | 'text'>>) => {
    setTeaserRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
    if (patch.date) {
      const d = patch.date
      if (isValid(d)) setEmbeddedSelection(startOfDay(d))
    }
  }, [])

  const handleEmbeddedCalendarSelect = useCallback(
    (d: Date | undefined) => {
      if (!teaseFutureContent || !d || !isValid(d)) return
      const day = startOfDay(d)
      setEmbeddedSelection(day)
      setCalendarMonth(startOfMonth(day))

      const match = teaserRows.find(
        (r) => r.date && isValid(r.date) && isSameDay(startOfDay(r.date), day),
      )

      if (match) {
        setFocusedRowId(match.id)
        requestAnimationFrame(() => {
          rowAnchorsRef.current.get(match.id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        })
        return
      }

      let newId: string | null = null
      setTeaserRows((rows) => {
        if (rows.length >= MAX_CAL_TEASER_ROWS) return rows
        newId = crypto.randomUUID()
        return [...rows, { id: newId!, date: day, text: '' }]
      })
      if (newId) {
        setFocusedRowId(newId)
        requestAnimationFrame(() => {
          rowAnchorsRef.current.get(newId!)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        })
      }
    },
    [teaseFutureContent, teaserRows],
  )

  const addTeaserRow = useCallback(() => {
    setTeaserRows((rows) =>
      rows.length >= MAX_CAL_TEASER_ROWS
        ? rows
        : [...rows, { id: crypto.randomUUID(), date: undefined, text: '' }],
    )
  }, [])

  const removeTeaserRow = useCallback((id: string) => {
    setFocusedRowId((fid) => (fid === id ? null : fid))
    setTeaserRows((rows) => {
      const next = rows.filter((r) => r.id !== id)
      return next.length > 0 ? next : [{ id: crypto.randomUUID(), date: undefined, text: '' }]
    })
  }, [])

  const saveCalendar = async () => {
    setSaving(true)
    setError(null)
    setSavedAt(null)
    try {
      const res = await fetch('/api/circe-churn/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tease_future_content: teaseFutureContent,
          calendar_teaser_notes: serializedCalendarTeasers,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 402) {
        const payload = data as { used?: number; limit?: number }
        openCreditInsufficientModal({
          requiredCredits: creditsPerRun,
          used: typeof payload.used === 'number' ? payload.used : undefined,
          limit: typeof payload.limit === 'number' ? payload.limit : undefined,
          contextLabel: 'Retention calendar',
        })
        await refreshCredits()
        return
      }
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Save failed')
        return
      }
      setSavedAt(new Date().toLocaleTimeString())
    } catch {
      setError('Save failed')
    } finally {
      setSaving(false)
    }
  }

  /** Persists teaser calendar, then runs the same churn batch job as Churn Predictor (OnlyFans + Fansly CRM, capped batch server-side). */
  const runScanNow = async () => {
    setScanning(true)
    setError(null)
    try {
      const settingsBody = {
        tease_future_content: teaseFutureContent,
        calendar_teaser_notes: serializedCalendarTeasers,
      }
      const saveFirst = await fetch('/api/circe-churn/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsBody),
      })
      const saveJson = await saveFirst.json().catch(() => ({}))

      if (saveFirst.status === 402) {
        const payload = saveJson as { used?: number; limit?: number }
        openCreditInsufficientModal({
          requiredCredits: creditsPerRun,
          used: typeof payload.used === 'number' ? payload.used : undefined,
          limit: typeof payload.limit === 'number' ? payload.limit : undefined,
          contextLabel: 'Retention calendar',
        })
        await refreshCredits()
        return
      }

      if (!saveFirst.ok) {
        setError(typeof saveJson.error === 'string' ? saveJson.error : 'Could not save teaser settings before scan')
        return
      }

      const res = await fetch('/api/circe-churn/run', { method: 'POST' })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        result?: {
          ran?: boolean
          candidates?: number
          skippedReason?: string
          creditsCharged?: number
          error?: string
        }
      }

      if (res.status === 402) {
        const payload = data as { error?: string; used?: number; limit?: number }
        const cost = Math.min(10, Math.max(1, Math.round(Number(creditsPerRun) || 2)))
        openCreditInsufficientModal({
          requiredCredits: cost,
          used: typeof payload.used === 'number' ? payload.used : undefined,
          limit: typeof payload.limit === 'number' ? payload.limit : undefined,
          contextLabel: 'Churn scan',
        })
        await refreshCredits()
        return
      }

      if (res.status === 403) {
        setError(
          typeof data.error === 'string'
            ? data.error
            : 'Pro or an active trial is required to run churn scans.',
        )
        return
      }

      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Scan failed')
        return
      }

      await load()

      const r = data.result
      if (r?.error) {
        setError(r.error)
        await refreshCredits()
        return
      }

      const n = typeof r?.candidates === 'number' ? r.candidates : 0
      if (n === 0) {
        toast({
          title: 'Scan finished',
          description: (
            <>
              No fans matched your churn rules this run — see rules and digests anytime in{' '}
              <Link href="/dashboard/retention/churn" className="font-medium text-primary underline-offset-2 hover:underline">
                Churn Predictor
              </Link>
              .
            </>
          ),
        })
      } else {
        toast({
          title: 'Scan finished',
          description: (
            <>
              {n} qualifying subscriber{n === 1 ? '' : 's'} — retention digest saved with your calendar. Read it in{' '}
              <Link href="/dashboard/retention/churn" className="font-medium text-primary underline-offset-2 hover:underline">
                Churn Predictor
              </Link>
              .
            </>
          ),
        })
      }
      await refreshCredits()
    } catch {
      setError('Scan failed')
    } finally {
      setScanning(false)
    }
  }

  const scanCreditCost = Math.min(10, Math.max(1, Math.round(Number(creditsPerRun) || 2)))
  const creditsRemaining = wallet?.totalRemaining ?? 0
  const canAffordScan = !creditsLoading && creditsRemaining >= scanCreditCost

  if (loading) {
    return (
      <div className={cn('flex min-h-[200px] flex-col items-center justify-center gap-3 text-muted-foreground', className)}>
        <Loader2 className="h-7 w-7 animate-spin opacity-80" aria-hidden />
        <p className="text-[13px] tracking-wide text-muted-foreground/90">Loading calendar</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/25 bg-destructive/[0.06] px-4 py-3 text-[14px] leading-snug text-destructive"
        >
          {error}
        </div>
      ) : null}

      <Card className={cn(surfaceCard, 'overflow-hidden')} id="future-tease">
        <CardHeader className="space-y-0 border-b border-border/25 px-6 py-6 sm:px-8 sm:py-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
            <div className="min-w-0 max-w-xl space-y-2">
              <p className={sectionKicker}>Upcoming drops</p>
              <CardTitle className="font-sans text-xl font-semibold tracking-tight text-foreground sm:text-[22px]">
                Content calendar
              </CardTitle>
              <CardDescription className="text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
                Dates you add here can be referenced in retention scans—so suggestions stay aligned with your real plans.
              </CardDescription>
            </div>
            <Switch
              checked={teaseFutureContent}
              onCheckedChange={setTeaseFutureContent}
              aria-label="Include future content teasers in churn scans"
              className="mt-1 shrink-0 data-[state=checked]:bg-foreground"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-5 px-6 py-6 sm:px-8 sm:py-7 sm:pb-8">
          {/* Month grid overview — same data as list rows; tap to jump / add */}
          <div
            className={cn(
              'flex flex-col gap-5 rounded-2xl border border-border/30 bg-gradient-to-br from-muted/[0.08] via-transparent to-primary/[0.04] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.035)] sm:flex-row sm:items-stretch sm:gap-8 sm:p-5',
              !teaseFutureContent && 'pointer-events-none opacity-40',
            )}
          >
            <div
              className={cn(
                'relative shrink-0 overflow-hidden rounded-xl border border-border/35 bg-background/60 p-3 shadow-sm sm:min-w-[min(100%,20.5rem)]',
                'dark:border-border/30 dark:bg-background/40 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]',
              )}
            >
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_90%_at_30%_-30%,oklch(0.78_0.12_85/0.06),transparent_55%)] dark:bg-[radial-gradient(ellipse_110%_85%_at_30%_-20%,oklch(0.78_0.12_85/0.09),transparent_50%)]"
                aria-hidden
              />
              <Calendar
                mode="single"
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                selected={embeddedSelection}
                onSelect={handleEmbeddedCalendarSelect}
                captionLayout="dropdown"
                modifiers={{ planned: plannedDatesForModifiers }}
                modifiersClassNames={{
                  planned:
                    'font-medium text-foreground [&_button:not([data-selected-single])]:bg-primary/12 dark:[&_button:not([data-selected-single])]:bg-primary/15 [&_button:not([data-selected-single])]:text-foreground [&_button:not([data-selected-single])]:ring-1 [&_button:not([data-selected-single])]:ring-primary/50',
                }}
                fromYear={new Date().getFullYear()}
                toYear={new Date().getFullYear() + 2}
                className="relative z-[1] [--cell-size:2.45rem] bg-transparent p-2 sm:[--cell-size:2.65rem] sm:p-3"
                classNames={{
                  today:
                    'bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-md data-[selected=true]:shadow-[0_0_0_3px_rgb(234_179_8/0.28)] dark:data-[selected=true]:shadow-[0_0_0_3px_rgb(234_179_8/0.35)]',
                }}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 pb-1 sm:py-1">
              <p className="text-[13px] font-semibold leading-snug text-foreground">At-a-glance</p>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Highlights follow your rows below — days with a teaser note stand out so scans can reference what you&apos;re actually planning.
              </p>
              <ul className="space-y-2 text-[12px] leading-relaxed text-muted-foreground/95">
                <li className="flex items-start gap-2">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_12px_-1px_rgb(234_179_8/0.55)] dark:shadow-[0_0_12px_-1px_rgb(250_204_21/0.45)]"
                    aria-hidden
                  />
                  <span>
                    Days with planned copy use a subtle gold ring{' '}
                    <span className="tabular-nums text-muted-foreground/85">({plannedDatesForModifiers.length})</span>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-4 w-4 shrink-0 rounded border-2 border-primary bg-primary opacity-95" aria-hidden />
                  <span>Tap any day — jump to its row when it exists, or add a dated row if it doesn&apos;t.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="relative space-y-3">
            {teaserRows.map((row) => (
              <div
                key={row.id}
                ref={(el) => {
                  if (el) rowAnchorsRef.current.set(row.id, el)
                  else rowAnchorsRef.current.delete(row.id)
                }}
                className={cn(
                  'flex flex-col gap-2.5 rounded-xl px-1.5 py-2 sm:flex-row sm:items-center sm:gap-3 sm:px-2 sm:py-2',
                  focusedRowId === row.id &&
                    'border border-primary/40 bg-primary/[0.06] shadow-[inset_0_0_0_1px_rgba(234,179,8,0.12)] ring-[3px] ring-primary/25 dark:bg-primary/[0.08]',
                  !teaseFutureContent && 'pointer-events-none opacity-40',
                )}
              >
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!teaseFutureContent}
                      className={cn(
                        'h-11 w-full shrink-0 justify-start rounded-xl border-border/45 bg-background/60 px-3.5 text-[14px] font-normal shadow-none sm:w-[11rem]',
                        !row.date && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
                      {row.date ? format(row.date, 'MMM d, yyyy') : 'Date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto overflow-hidden border-border/40 p-0 shadow-lg" align="start">
                    <Calendar
                      mode="single"
                      selected={row.date}
                      onSelect={(d) => patchTeaserRow(row.id, { date: d })}
                      captionLayout="dropdown"
                      fromYear={new Date().getFullYear()}
                      toYear={new Date().getFullYear() + 2}
                      className="rounded-xl"
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  value={row.text}
                  onChange={(e) => patchTeaserRow(row.id, { text: e.target.value.slice(0, 500) })}
                  placeholder="What’s planned that day"
                  disabled={!teaseFutureContent}
                  className="h-11 flex-1 rounded-xl border-border/45 bg-background/70 text-[14px] shadow-none"
                  aria-label={`Plan for ${row.date ? format(row.date, 'yyyy-MM-dd') : 'undated row'}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!teaseFutureContent || teaserRows.length <= 1}
                  className="h-11 w-11 shrink-0 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  onClick={() => removeTeaserRow(row.id)}
                  aria-label="Remove row"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 border-t border-border/25 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!teaseFutureContent || teaserRows.length >= MAX_CAL_TEASER_ROWS}
              className="h-10 w-fit gap-2 rounded-xl px-3 text-[13px] text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              onClick={addTeaserRow}
            >
              <Plus className="h-4 w-4" />
              Add row
            </Button>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Persists when you tap <span className="text-foreground/90">Save</span>
              {showScanActions ? (
                <>
                  {' '}
                  or <span className="text-foreground/90">Scan now</span>.
                </>
              ) : (
                '.'
              )}
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/25 pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void saveCalendar()}
                disabled={saving}
                className="h-11 rounded-xl px-6 text-[14px] font-medium"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
              {showScanActions ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl px-6 text-[14px] font-medium"
                  disabled={scanning || creditsLoading || !canAffordScan}
                  title={
                    !canAffordScan && !creditsLoading
                      ? `Need at least ${scanCreditCost} AI credit${scanCreditCost === 1 ? '' : 's'} (you have ${creditsRemaining}).`
                      : `First saves your teaser calendar to the server, then runs Churn Predictor across synced OnlyFans + Fansly (up to 25 qualifiers). Charges up to ${scanCreditCost} credits when matches are found (same rule as Credits per match). Nothing charged if nobody qualifies.`
                  }
                  onClick={() => void runScanNow()}
                >
                  {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4 opacity-90" />}
                  Scan now
                </Button>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-col gap-1 text-[12px] text-muted-foreground sm:items-end sm:text-right">
              {savedAt ? (
                <span className="tabular-nums text-foreground/80">Saved {savedAt}</span>
              ) : null}
              {showScanActions ? (
                <span className="flex items-start gap-1.5 sm:justify-end">
                  <Coins className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                  <span>
                    {creditsLoading ? (
                      'Loading balance…'
                    ) : (
                      <>
                        <span className="tabular-nums font-medium text-foreground/80">{creditsRemaining}</span> left ·
                        OnlyFans + Fansly ·{' '}
                        <span className="tabular-nums font-medium text-foreground/80">{scanCreditCost}</span> if anyone
                        matches ·{' '}
                        {!canAffordScan ? (
                          <Link
                            href="/dashboard/settings?tab=billing"
                            className="font-medium text-primary underline-offset-2 hover:underline"
                          >
                            Add credits
                          </Link>
                        ) : (
                          <span className="text-muted-foreground/85">none if empty</span>
                        )}
                      </>
                    )}
                  </span>
                </span>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
