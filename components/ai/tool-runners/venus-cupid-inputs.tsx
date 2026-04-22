'use client'

import Link from 'next/link'
import { Checkbox } from '@/components/ui/checkbox'

export type VenusCupidRunnerInputsProps = {
  easy: boolean
  cupidTagChurn: boolean
  setCupidTagChurn: (v: boolean) => void
}

export function VenusCupidRunnerInputs({ easy, cupidTagChurn, setCupidTagChurn }: VenusCupidRunnerInputsProps) {
  if (easy) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">We pull your newest fans and draft warm openers. One tap to run.</p>
        <div className="flex items-start gap-2 rounded-lg border border-border p-3">
          <Checkbox
            id="cupid-churn-tag-easy"
            checked={cupidTagChurn}
            onCheckedChange={(v) => setCupidTagChurn(v === true)}
          />
          <label htmlFor="cupid-churn-tag-easy" className="cursor-pointer text-sm text-muted-foreground">
            Also tag saved CRM rows for churn follow-up
          </label>
        </div>
        <p className="text-[11px] text-muted-foreground">Pro mode: links to Retention and Churn Predictor.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        <strong className="text-foreground">Generate</strong> loads your <strong className="text-foreground">newest fans</strong>{' '}
        from CRM + live OnlyFans/Fansly lists, then suggests how to welcome and engage them. Optional links:{' '}
        <Link href="/dashboard/retention/churn" className="text-primary underline hover:no-underline">
          Retention → Churn
        </Link>
        ,{' '}
        <Link href="/dashboard/ai-studio/tools/churn-predictor" className="text-primary underline hover:no-underline">
          Churn Predictor
        </Link>
        .
      </p>
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
        <Checkbox id="cupid-churn-tag" checked={cupidTagChurn} onCheckedChange={(v) => setCupidTagChurn(v === true)} />
        <label htmlFor="cupid-churn-tag" className="cursor-pointer text-xs leading-snug text-muted-foreground">
          <span className="font-medium text-foreground">Tag CRM fans for churn follow-up</span> — append a short note on
          each <strong className="text-foreground">saved</strong> fan row so you remember they belong in Churn Predictor /
          retention workflows (live-only fans need a CRM sync first).
        </label>
      </div>
    </div>
  )
}
