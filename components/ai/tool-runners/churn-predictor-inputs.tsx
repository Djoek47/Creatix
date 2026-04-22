'use client'

import Link from 'next/link'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ChurnFanPickerRow } from '@/lib/crm/fetch-crm-fans-client'
import type { CrmFansResponse } from '@/lib/crm/crm-fan-types'

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
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Pick someone from your CRM — we&apos;ll flag churn risk and what to do next.
        </p>
        <div className="space-y-2">
          <Label>Fan</Label>
          <Select value={churnFanId} onValueChange={setChurnFanId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose fan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Type details myself</SelectItem>
              {churnFans.map((f) => (
                <SelectItem key={`${f.platform}-${f.id}`} value={f.id}>
                  <span className="inline-flex items-center gap-1.5 flex-wrap">
                    <span className="rounded border border-border px-1 py-0 text-[10px] uppercase text-muted-foreground">
                      {f.platform === 'onlyfans' ? 'OF' : f.platform === 'fansly' ? 'Fansly' : f.platform}
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
            <p className="text-xs text-muted-foreground">
              No fans loaded yet — connect a platform or use &quot;Type details myself&quot;.
            </p>
          ) : null}
        </div>
        {churnFanId === 'manual' ? (
          <div className="space-y-2">
            <Label>Fan in your words</Label>
            <Textarea
              placeholder="Spend, how long they’ve been subbed, what changed…"
              value={fanMessage}
              onChange={(e) => setFanMessage(e.target.value)}
              className="min-h-[88px]"
            />
          </div>
        ) : null}
        <div className="space-y-2">
          <Label>Anything new? (optional)</Label>
          <Textarea
            placeholder="Recent DMs, tips, or weird silence…"
            value={contentDescription}
            onChange={(e) => setContentDescription(e.target.value)}
            className="min-h-[72px]"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">Pro mode: expiring-soon filter, full CRM notes, and retention links.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-snug">
        <span className="font-medium text-foreground">Circe&apos;s Oracle</span> is now this tool: pick a fan to see who&apos;s
        at risk of churning and get concrete retention plays. Batch digests live on{' '}
        <Link className="text-primary underline-offset-2 hover:underline" href="/dashboard/retention/churn">
          Retention
        </Link>
        .
      </p>
      <div className="space-y-2">
        <Label>Fan from CRM (spend, renewal dates, thread insight, synced DMs)</Label>
        <p className="text-xs text-muted-foreground">
          Open <Link className="text-primary underline-offset-2 hover:underline" href="/dashboard/messages">Messages</Link>{' '}
          for a fan so DMs save to your cache — thread text improves this run even without a separate scan.
        </p>
        <div className="flex items-center gap-2">
          <Checkbox
            id="churn-expiring-only"
            checked={churnExpiringOnly}
            onCheckedChange={(v) => setChurnExpiringOnly(v === true)}
          />
          <Label htmlFor="churn-expiring-only" className="text-sm font-normal cursor-pointer">
            Only fans with period ending in 14 days (needs sync)
          </Label>
        </div>
        <Select value={churnFanId} onValueChange={setChurnFanId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose fan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual entry only</SelectItem>
            {churnFansFiltered.map((f) => (
              <SelectItem key={`${f.platform}-${f.id}`} value={f.id}>
                <span className="inline-flex items-center gap-1.5 flex-wrap">
                  <span className="rounded border border-border px-1 py-0 text-[10px] uppercase text-muted-foreground">
                    {f.platform === 'onlyfans' ? 'OF' : f.platform === 'fansly' ? 'Fansly' : f.platform}
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
          <p className="text-xs text-amber-600 dark:text-amber-500">{crmFansMeta.warnings.join(' ')}</p>
        ) : null}
        {!churnExpiringOnly && churnFansFiltered.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {crmFansMeta == null
              ? 'Could not load fans. Refresh the page or try again.'
              : crmFansMeta.onlyFansConnected || crmFansMeta.fanslyConnected
                ? 'No CRM rows or live subscribers loaded yet. Open Fans and refresh sync, or check Integrations if a session expired.'
                : 'Connect OnlyFans or Fansly in Settings, then open Fans to sync — or pick Manual entry below.'}
          </p>
        ) : null}
        {churnExpiringOnly && churnFansFiltered.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No matches. On Fans, open Sync → Full CRM update so subscription end dates populate.
          </p>
        ) : null}
      </div>
      {churnFanId === 'manual' ? (
        <div className="space-y-2">
          <Label>Fan information</Label>
          <Textarea
            placeholder="Subscription length, spending, patterns…"
            value={fanMessage}
            onChange={(e) => setFanMessage(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Optional: extra spending / trend notes</Label>
          <Textarea
            placeholder="e.g. tips dropped this month vs last…"
            value={fanMessage}
            onChange={(e) => setFanMessage(e.target.value)}
            className="min-h-[80px]"
          />
        </div>
      )}
      <div className="space-y-2">
        <Label>Recent behavior or context (optional)</Label>
        <Textarea
          placeholder="Anything that changed lately in DMs or purchases…"
          value={contentDescription}
          onChange={(e) => setContentDescription(e.target.value)}
          className="min-h-[80px]"
        />
      </div>
    </div>
  )
}
