'use client'

import { useCallback, useEffect, useState } from 'react'
import { format, isValid, parseISO } from 'date-fns'
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
import Link from 'next/link'

type TeaserRow = { id: string; date: Date | undefined; text: string }

const MAX_CAL_TEASER_ROWS = 24

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
  }, [])

  const addTeaserRow = useCallback(() => {
    setTeaserRows((rows) =>
      rows.length >= MAX_CAL_TEASER_ROWS
        ? rows
        : [...rows, { id: crypto.randomUUID(), date: undefined, text: '' }],
    )
  }, [])

  const removeTeaserRow = useCallback((id: string) => {
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

  const runScanNow = async () => {
    setScanning(true)
    setError(null)
    try {
      const saveFirst = await fetch('/api/circe-churn/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tease_future_content: teaseFutureContent,
          calendar_teaser_notes: serializedCalendarTeasers,
        }),
      })
      if (!saveFirst.ok) {
        const data = await saveFirst.json().catch(() => ({}))
        setError(typeof data.error === 'string' ? data.error : 'Could not save teaser settings')
        return
      }
      const res = await fetch('/api/circe-churn/run', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.status === 402) {
        const payload = data as { used?: number; limit?: number }
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
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Scan failed')
        return
      }
      await load()
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
          <div className="space-y-3">
            {teaserRows.map((row) => (
              <div
                key={row.id}
                className={cn(
                  'flex flex-col gap-2.5 sm:flex-row sm:items-center',
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
                      : undefined
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
                        <span className="tabular-nums font-medium text-foreground/80">{creditsRemaining}</span> left ·{' '}
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
