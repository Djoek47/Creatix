'use client'

import Link from 'next/link'
import {
  UserRound,
  MessagesSquare,
  ArrowRight,
  CalendarClock,
  LayoutGrid,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ChurnFanPickerRow } from '@/lib/crm/fetch-crm-fans-client'
import type { CrmFansResponse } from '@/lib/crm/crm-fan-types'
import { cn } from '@/lib/utils'

export type ChurnPredictorRunnerInputsProps = {
  easy: boolean
  churnFanId: string
  setChurnFanId: (v: string) => void
  churnFans: ChurnFanPickerRow[]
  churnFansFiltered: ChurnFanPickerRow[]
  churnExpiringOnly: boolean
  setChurnExpiringOnly: (v: boolean) => void
  fanMessage: string
  setFanMessage: (v: string | React.SetStateAction<string>) => void
  contentDescription: string
  setContentDescription: (v: string | React.SetStateAction<string>) => void
  crmFansMeta: CrmFansResponse['meta'] | null
}

const selectTriggerClass =
  'h-11 w-full rounded-xl border-border/45 bg-background/70 text-left text-[14px] font-normal shadow-none'

const sectionShell = 'rounded-2xl border border-border/35 bg-card/45 p-4 shadow-sm dark:border-border/25 dark:bg-card/35 sm:p-5'

const kicker = 'text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground'

function QuickLink({
  href,
  icon: Icon,
  label,
  sub,
}: {
  href: string
  icon: typeof LayoutGrid
  label: string
  sub: string
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-[min(100%,11rem)] flex-1 items-start gap-2.5 rounded-xl border border-border/35 bg-background/50 px-3 py-2.5 text-left transition-colors hover:border-primary/35 hover:bg-primary/[0.04] sm:min-w-0 sm:flex-initial"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-muted/30 text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-[13px] font-medium text-foreground">
          {label}
          <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{sub}</span>
      </span>
    </Link>
  )
}

export function ChurnPredictorRunnerInputs({
  easy,
  churnFanId,
  setChurnFanId,
  churnFans,
  churnFansFiltered,
  churnExpiringOnly,
  setChurnExpiringOnly,
  fanMessage,
  setFanMessage,
  contentDescription,
  setContentDescription,
  crmFansMeta,
}: ChurnPredictorRunnerInputsProps) {
  if (easy) {
    return (
      <div className="space-y-5">
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          Pick someone from your CRM — we&apos;ll surface churn risk and practical next steps.
        </p>
        <div className={cn(sectionShell, 'space-y-3')}>
          <p className={kicker}>Fan</p>
          <Select value={churnFanId} onValueChange={setChurnFanId}>
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder="Choose fan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Type details myself</SelectItem>
              {churnFans.map((f) => (
                <SelectItem key={`${f.platform}-${f.id}`} value={f.id}>
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    <span className="rounded border border-border px-1 py-0 text-[10px] uppercase text-muted-foreground">
                      {f.platform === 'onlyfans' ? 'OnlyFans' : f.platform === 'fansly' ? 'Fansly' : f.platform}
                    </span>
                    <span>
                      @{f.username}
                      {f.display_name ? ` (${f.display_name})` : ''} · {Number(f.total_spent ?? 0).toFixed(0)} spend
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {churnFans.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">
              No fans loaded yet — connect a platform or use &quot;Type details myself&quot;.
            </p>
          ) : null}
        </div>
        {churnFanId === 'manual' ? (
          <div className={cn(sectionShell, 'space-y-2')}>
            <p className={kicker}>Describe the fan</p>
            <Textarea
              placeholder="Spend, tenure, what changed recently…"
              value={fanMessage}
              onChange={(e) => setFanMessage(e.target.value)}
              className="min-h-[88px] rounded-xl border-border/45 bg-background/70 text-[14px]"
            />
          </div>
        ) : null}
        <div className={cn(sectionShell, 'space-y-2')}>
          <p className={kicker}>Anything new? (optional)</p>
          <Textarea
            placeholder="Recent DMs, tips, or unusual silence…"
            value={contentDescription}
            onChange={(e) => setContentDescription(e.target.value)}
            className="min-h-[72px] rounded-xl border-border/45 bg-background/70 text-[14px]"
          />
        </div>
        <p className="text-center text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground/90">Pro</span> adds expiring-soon filter, renewal dates in the list,
          and deeper CRM context.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <QuickLink
          href="/dashboard/retention/churn"
          icon={LayoutGrid}
          label="Batch & schedule"
          sub="Multi-fan digests, Scan now, calendar teasers"
        />
        <QuickLink
          href="/dashboard/retention/tease"
          icon={CalendarClock}
          label="Content calendar"
          sub="Teasers referenced in scans"
        />
        <QuickLink
          href="/dashboard/messages"
          icon={MessagesSquare}
          label="Messages"
          sub="Refresh thread cache for richer context"
        />
      </div>

      <p className="text-[14px] leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">This run</span> is one fan at a time with CRM + thread context.
        Use <span className="text-foreground/95">Batch & schedule</span> for scheduled multi-fan digests across
        OnlyFans and Fansly.
      </p>

      <div className={sectionShell}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
            <UserRound className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <p className={kicker}>Step 1 — Who</p>
              <p className="mt-1 text-[13px] font-medium text-foreground">Choose a CRM fan or enter manually</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                Lists combine saved CRM rows with live subscribers where available; renewal dates need a recent sync from
                Fans.
              </p>
            </div>

            <div className="rounded-xl border border-border/25 bg-muted/[0.06] px-3 py-3 dark:bg-muted/[0.08]">
              <div className="flex gap-3">
                <Checkbox
                  id="churn-expiring-only"
                  checked={churnExpiringOnly}
                  onCheckedChange={(v) => setChurnExpiringOnly(v === true)}
                  className="mt-0.5 border-border/60 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                />
                <Label htmlFor="churn-expiring-only" className="cursor-pointer text-[13px] font-normal leading-snug">
                  Only show fans whose period ends within <span className="tabular-nums font-medium">14 days</span>
                  <span className="mt-0.5 block text-[12px] text-muted-foreground">
                    Requires subscription end dates in CRM — run a full sync if the list looks empty.
                  </span>
                </Label>
              </div>
            </div>

            <Select value={churnFanId} onValueChange={setChurnFanId}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="Select fan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual entry only</SelectItem>
                {churnFansFiltered.map((f) => (
                  <SelectItem key={`${f.platform}-${f.id}`} value={f.id}>
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <span className="rounded border border-border px-1 py-0 text-[10px] uppercase text-muted-foreground">
                        {f.platform === 'onlyfans' ? 'OnlyFans' : f.platform === 'fansly' ? 'Fansly' : f.platform}
                      </span>
                      <span>
                        @{f.username}
                        {f.display_name ? ` (${f.display_name})` : ''} · {Number(f.total_spent ?? 0).toFixed(0)} spend
                        {f.subscription_expires_at ? ` · ends ${f.subscription_expires_at.slice(0, 10)}` : ''}
                        {f._source !== 'database' ? ' · live list' : ''}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {crmFansMeta?.warnings?.length ? (
              <Alert className="border-amber-500/35 bg-amber-500/[0.07] dark:bg-amber-500/[0.09]">
                <AlertDescription className="text-[13px] leading-relaxed text-amber-950 dark:text-amber-100">
                  {crmFansMeta.warnings.join(' ')}
                </AlertDescription>
              </Alert>
            ) : null}

            {!churnExpiringOnly && churnFansFiltered.length === 0 ? (
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                {crmFansMeta == null
                  ? 'Fans could not be loaded. Refresh the page or try again.'
                  : crmFansMeta.onlyFansConnected || crmFansMeta.fanslyConnected
                    ? 'No CRM rows or live subscribers yet. Open Fans to sync, check Integrations if a session expired, or use manual entry.'
                    : 'Connect OnlyFans or Fansly in Settings, sync from Fans, or use manual entry.'}
              </p>
            ) : null}
            {churnExpiringOnly && churnFansFiltered.length === 0 ? (
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                No one matches the expiring window. Run a full CRM update from Fans so subscription end dates populate.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <Separator className="bg-border/50" />

      <div className={sectionShell}>
        <p className={kicker}>Step 2 — Context for the model</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          More detail usually means better plays; all fields below are optional when a CRM fan is selected.
        </p>

        <div className="mt-4 space-y-4">
          {churnFanId === 'manual' ? (
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-foreground" htmlFor="churn-manual-fan">
                Fan details
              </Label>
              <p className="text-[12px] text-muted-foreground">Who they are, spend level, tenure, and what worries you.</p>
              <Textarea
                id="churn-manual-fan"
                placeholder="Example: 6-month sub, used to tip weekly, quiet for 10 days…"
                value={fanMessage}
                onChange={(e) => setFanMessage(e.target.value)}
                className="min-h-[120px] rounded-xl border-border/45 bg-background/70 text-[14px]"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-foreground" htmlFor="churn-spend-notes">
                Spend & trend notes (optional)
              </Label>
              <p className="text-[12px] text-muted-foreground">Adds on top of CRM totals — e.g. tips vs last month.</p>
              <Textarea
                id="churn-spend-notes"
                placeholder="e.g. tips down vs last month, PPV purchases stopped…"
                value={fanMessage}
                onChange={(e) => setFanMessage(e.target.value)}
                className="min-h-[88px] rounded-xl border-border/45 bg-background/70 text-[14px]"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[13px] font-medium text-foreground" htmlFor="churn-behavior">
              Recent behavior (optional)
            </Label>
            <p className="text-[12px] text-muted-foreground">DM tone, boundaries, or anything that changed lately.</p>
            <Textarea
              id="churn-behavior"
              placeholder="Short notes on chat, purchases, or silence…"
              value={contentDescription}
              onChange={(e) => setContentDescription(e.target.value)}
              className="min-h-[88px] rounded-xl border-border/45 bg-background/70 text-[14px]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
