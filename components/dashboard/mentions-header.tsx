'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Coins, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useScanIdentity } from '@/hooks/use-scan-identity'
import { ScanHandlePicker } from '@/components/dashboard/scan-handle-picker'
import { CREDITS_REPUTATION_WEB_SCAN } from '@/lib/billing/credit-economics'
import { cn } from '@/lib/utils'
import { InsufficientCreditsCallout } from '@/components/billing/insufficient-credits-callout'
import { useCreditSnapshot } from '@/hooks/use-credit-snapshot'

export function MentionsHeader() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [useAllHandles] = useState(false)
  const [selectedHandles, setSelectedHandles] = useState<Set<string>>(new Set())
  const { handles: identityHandles } = useScanIdentity()
  const { wallet, loading: creditsLoading, error: creditsError, refresh: refreshCredits } = useCreditSnapshot()
  const [scanError, setScanError] = useState<string | null>(null)
  const [apiCreditBlocked, setApiCreditBlocked] = useState(false)

  const creditsRemaining = wallet?.totalRemaining
  const scanDisabledByBalance =
    typeof creditsRemaining === 'number' && creditsRemaining < CREDITS_REPUTATION_WEB_SCAN

  const toggleSelectedHandle = (value: string) => {
    setSelectedHandles((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('mentions_selected_handles', JSON.stringify(Array.from(next)))
      }
      return next
    })
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem('mentions_selected_handles')
      if (!raw) return
      const parsed = JSON.parse(raw) as string[]
      if (!Array.isArray(parsed)) return
      const allowed = new Set(identityHandles.map((h) => h.value))
      const picked = parsed.filter((h) => allowed.has(h))
      setSelectedHandles(new Set(picked))
    } catch {
      // ignore malformed storage
    }
  }, [identityHandles])

  const handleRefreshVision = async () => {
    if (identityHandles.length === 0 || selectedHandles.size === 0) {
      return
    }
    if (scanDisabledByBalance) {
      return
    }
    setScanError(null)
    setApiCreditBlocked(false)
    setLoading(true)
    try {
      const handlePayload = Array.from(selectedHandles)
      const res = await fetch('/api/social/scan-reputation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'both',
          ...(handlePayload ? { handles: handlePayload } : {}),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string }
      if (!res.ok) {
        if (res.status === 402) {
          setApiCreditBlocked(true)
          void refreshCredits()
          return
        }
        setScanError(
          typeof data.error === 'string' ? data.error : 'Scan failed',
        )
        return
      }
      if (data?.success) {
        try {
          await fetch('/api/social/reputation-briefing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ handles: handlePayload }),
          })
        } catch {
          // best-effort: briefing runs async for aggregate intelligence
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

  const costLabel = `${CREDITS_REPUTATION_WEB_SCAN} credit${CREDITS_REPUTATION_WEB_SCAN === 1 ? '' : 's'}`

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 border-b border-border/50 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
          <div
            className={cn(
              'inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/60 bg-muted/25 px-2 py-1 tabular-nums text-muted-foreground',
              scanDisabledByBalance && 'border-destructive/30 text-destructive',
            )}
            title="Wallet balance (included + purchased). Same pool as other AI features."
          >
            <Coins className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            {creditsLoading && !creditsError ? (
              <span>Loading credits…</span>
            ) : creditsError ? (
              <span className="text-destructive">{creditsError}</span>
            ) : (
              <span className="text-foreground">
                <span className="font-medium">
                  {typeof creditsRemaining === 'number' ? creditsRemaining.toLocaleString() : '—'}
                </span>
                <span className="text-muted-foreground"> left</span>
              </span>
            )}
          </div>
          <span className="text-muted-foreground">
            Scan web · <span className="font-medium text-foreground/90">{costLabel}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Button variant="ghost" size="sm" asChild className="h-8 text-xs text-muted-foreground hover:text-foreground">
            <Link href="/dashboard/settings?tab=integrations">Integrations</Link>
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-venus px-3 text-xs text-background hover:bg-venus/90"
            onClick={handleRefreshVision}
            disabled={
              loading ||
              identityHandles.length === 0 ||
              selectedHandles.size === 0 ||
              scanDisabledByBalance
            }
            title={
              scanDisabledByBalance
                ? 'Add AI credits in Billing or wait for your monthly included pool.'
                : `Uses ${costLabel} from your balance.`
            }
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Scan web
          </Button>
        </div>
      </div>

      {(scanDisabledByBalance || apiCreditBlocked) && (
        <InsufficientCreditsCallout
          requiredCredits={CREDITS_REPUTATION_WEB_SCAN}
          actionContext="a web reputation scan (Scan web)"
        />
      )}

      {scanError && !apiCreditBlocked ? <p className="text-xs text-destructive">{scanError}</p> : null}

      {identityHandles.length > 1 && (
        <ScanHandlePicker
          handles={identityHandles}
          useAll={useAllHandles}
          onUseAllChange={() => undefined}
          selected={selectedHandles}
          onToggle={toggleSelectedHandle}
          idPrefix="mentions-header"
        />
      )}
    </div>
  )
}
