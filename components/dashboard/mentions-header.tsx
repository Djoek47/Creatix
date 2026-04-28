'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Coins, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useScanIdentity } from '@/hooks/use-scan-identity'
import { ScanHandlePicker } from '@/components/dashboard/scan-handle-picker'
import { CREDITS_REPUTATION_WEB_SCAN } from '@/lib/billing/credit-economics'
import { DASHBOARD_CREDIT_SUMMARY_MARK } from '@/lib/dashboard-credit-summary-marker'
import { cn } from '@/lib/utils'
import { InsufficientCreditsCallout } from '@/components/billing/insufficient-credits-callout'
import { useCreditSnapshot } from '@/hooks/use-credit-snapshot'

const STORAGE_KEY = 'mentions_selected_handles'

export function MentionsHeader() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [useAll, setUseAll] = useState(true)
  const [selectedHandles, setSelectedHandles] = useState<Set<string>>(new Set())
  const { handles: identityHandles } = useScanIdentity()
  const { wallet, loading: creditsLoading, error: creditsError, refresh: refreshCredits } = useCreditSnapshot()
  const [scanError, setScanError] = useState<string | null>(null)
  const [apiCreditBlocked, setApiCreditBlocked] = useState(false)

  const creditsRemaining = wallet?.totalRemaining
  const scanDisabledByBalance =
    typeof creditsRemaining === 'number' && creditsRemaining < CREDITS_REPUTATION_WEB_SCAN

  const costLabel = `${CREDITS_REPUTATION_WEB_SCAN} credit${CREDITS_REPUTATION_WEB_SCAN === 1 ? '' : 's'}`

  const persistSelection = useCallback((next: Set<string>) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)))
  }, [])

  useEffect(() => {
    if (identityHandles.length === 0) {
      setSelectedHandles(new Set())
      return
    }
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
      if (!raw) {
        setUseAll(true)
        setSelectedHandles(new Set(identityHandles.map((h) => h.value)))
        return
      }
      const parsed = JSON.parse(raw) as string[]
      if (!Array.isArray(parsed)) {
        setUseAll(true)
        setSelectedHandles(new Set(identityHandles.map((h) => h.value)))
        return
      }
      const allowed = new Set(identityHandles.map((h) => h.value))
      const picked = parsed.filter((h) => allowed.has(h))
      if (picked.length === 0) {
        setUseAll(true)
        setSelectedHandles(new Set(identityHandles.map((h) => h.value)))
        return
      }
      const full = picked.length >= identityHandles.length
      setUseAll(full)
      setSelectedHandles(new Set(picked))
    } catch {
      setUseAll(true)
      setSelectedHandles(new Set(identityHandles.map((h) => h.value)))
    }
  }, [identityHandles])

  const handleUseAllChange = (v: boolean) => {
    setUseAll(v)
    if (v) {
      const all = new Set(identityHandles.map((h) => h.value))
      setSelectedHandles(all)
      persistSelection(all)
    }
  }

  const toggleSelectedHandle = (value: string) => {
    setUseAll(false)
    setSelectedHandles((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      persistSelection(next)
      if (next.size >= identityHandles.length) {
        setUseAll(true)
        const all = new Set(identityHandles.map((h) => h.value))
        persistSelection(all)
        return all
      }
      return next
    })
  }

  const canScan =
    identityHandles.length > 0 && (useAll || selectedHandles.size > 0) && !scanDisabledByBalance

  const handleRefreshVision = async () => {
    if (!canScan || loading) return
    setScanError(null)
    setApiCreditBlocked(false)
    setLoading(true)
    try {
      const body: Record<string, unknown> = { mode: 'both' }
      if (!useAll) {
        body.handles = Array.from(selectedHandles)
      }
      const res = await fetch('/api/social/scan-reputation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string }
      if (!res.ok) {
        if (res.status === 402) {
          setApiCreditBlocked(true)
          void refreshCredits()
          return
        }
        setScanError(typeof data.error === 'string' ? data.error : 'Scan failed')
        return
      }
      if (data?.success) {
        try {
          const briefingBody =
            useAll || selectedHandles.size === 0 ? {} : { handles: Array.from(selectedHandles) }
          await fetch('/api/social/reputation-briefing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(briefingBody),
          })
        } catch {
          // best-effort
        }
      }
      void refreshCredits()
      router.refresh()
    } catch {
      setScanError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-3xl border border-border/50 bg-card/50 p-6 shadow-none backdrop-blur-sm sm:p-8 dark:bg-card/35" aria-labelledby="mentions-scan-heading">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
        <div className="min-w-0 flex-1 space-y-3">
          <h2 id="mentions-scan-heading" className="text-[15px] font-semibold tracking-tight text-foreground">
            Web scan
          </h2>
          <p className="max-w-md text-[14px] leading-relaxed text-muted-foreground/88">
            Refresh public mentions and social snippets for the identities you choose. Each run debits{' '}
            <span className="font-medium text-foreground/90">{costLabel}</span> from your AI wallet.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border border-border/55 bg-muted/30 px-3 py-1.5 tabular-nums dark:bg-muted/20',
                scanDisabledByBalance && 'border-destructive/35 bg-destructive/8 text-destructive',
              )}
              title="Included monthly pool plus any purchases — same balance as other AI features."
              {...DASHBOARD_CREDIT_SUMMARY_MARK}
            >
              <Coins className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden />
              {creditsLoading && !creditsError ? (
                <span className="text-[13px] text-muted-foreground">Loading…</span>
              ) : creditsError ? (
                <span className="text-[13px]">{creditsError}</span>
              ) : (
                <span className="text-[13px] text-muted-foreground/90">
                  <span className="font-semibold text-foreground">
                    {typeof creditsRemaining === 'number' ? creditsRemaining.toLocaleString() : '—'}
                  </span>
                  <span> credits available</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 sm:max-w-sm lg:w-[min(100%,20rem)]">
          <div className="rounded-2xl border border-border/45 bg-muted/15 p-4 dark:bg-muted/10">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/75">This run</p>
            <div className="mt-3 flex flex-col gap-3">
              <Button
                type="button"
                className="h-12 w-full rounded-xl bg-foreground text-[15px] font-medium text-background shadow-sm transition-colors hover:bg-foreground/88 disabled:pointer-events-none disabled:opacity-35"
                onClick={() => void handleRefreshVision()}
                disabled={loading || !canScan}
                title={
                  scanDisabledByBalance
                    ? 'Add credits in Billing or wait for your monthly pool.'
                    : `Uses ${costLabel} from your balance.`
                }
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
                    Scanning…
                  </span>
                ) : (
                  <span className="flex flex-col items-center gap-0.5 leading-tight sm:flex-row sm:gap-2">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                      Scan web
                    </span>
                    <span className="text-[13px] font-normal opacity-80">{costLabel}</span>
                  </span>
                )}
              </Button>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted-foreground/85">
                <Link
                  href="/dashboard/settings?tab=integrations"
                  className="font-medium text-foreground/85 underline-offset-4 hover:underline"
                >
                  Integrations
                </Link>
                <span className="hidden sm:inline">·</span>
                <span className="text-muted-foreground/75">Links add handles automatically</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {(scanDisabledByBalance || apiCreditBlocked) && (
        <div className="mt-6">
          <InsufficientCreditsCallout
            requiredCredits={CREDITS_REPUTATION_WEB_SCAN}
            actionContext="a web reputation scan (Scan web)"
          />
        </div>
      )}

      {scanError && !apiCreditBlocked ? (
        <p className="mt-4 text-[13px] text-destructive" role="alert">
          {scanError}
        </p>
      ) : null}

      {identityHandles.length > 1 ? (
        <div className="mt-8 border-t border-border/45 pt-8">
          <p className="mb-3 text-[13px] font-medium text-foreground/90">Scope</p>
          <p className="mb-4 max-w-xl text-[13px] leading-snug text-muted-foreground/85">
            By default, every linked identity is included. Narrow the scan when you want a lighter pass.
          </p>
          <ScanHandlePicker
            handles={identityHandles}
            useAll={useAll}
            onUseAllChange={handleUseAllChange}
            selected={selectedHandles}
            onToggle={toggleSelectedHandle}
            idPrefix="mentions-header"
            className="rounded-2xl border-border/50 bg-muted/10 p-4 dark:bg-muted/5"
          />
        </div>
      ) : null}
    </section>
  )
}
