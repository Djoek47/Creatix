'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Sparkles } from 'lucide-react'
import type { CreditPlanPriority } from '@/lib/billing/credit-planner'

type PlannerResult = {
  allocations: Array<{
    category: CreditPlanPriority
    credits: number
    percent: number
    estimatedActions: number
  }>
  projectedMonthlySpend: number
  estimatedDaysToDepletion: number
  safeModeSuggestion: string | null
}

export function CreditAllocationPlanner() {
  const [plannerLoading, setPlannerLoading] = useState(false)
  const [plannerResult, setPlannerResult] = useState<PlannerResult | null>(null)
  const [creatorSize, setCreatorSize] = useState<'solo' | 'small_team' | 'agency'>('solo')
  const [priorities, setPriorities] = useState<Set<CreditPlanPriority>>(new Set(['dm_growth']))
  const [targetMessages, setTargetMessages] = useState(1200)
  const [targetLeakScans, setTargetLeakScans] = useState(12)
  const [targetReputationScans, setTargetReputationScans] = useState(8)
  const [targetChatTurns, setTargetChatTurns] = useState(800)

  const runCreditPlanner = async () => {
    setPlannerLoading(true)
    try {
      const res = await fetch('/api/billing/credit-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorSize,
          priorities: [...priorities],
          targetActivityVolume: {
            messages: targetMessages,
            leakScans: targetLeakScans,
            reputationScans: targetReputationScans,
            chatTurns: targetChatTurns,
          },
        }),
      })
      const data = await res.json()
      if (res.ok) setPlannerResult(data.plan as PlannerResult)
    } finally {
      setPlannerLoading(false)
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="font-semibold">Credit Allocation Planner</CardTitle>
        <CardDescription>
          Build a monthly credit strategy by priority and workload targets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Creator size</Label>
            <Select value={creatorSize} onValueChange={(v) => setCreatorSize(v as typeof creatorSize)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solo">Solo</SelectItem>
                <SelectItem value="small_team">Small team</SelectItem>
                <SelectItem value="agency">Agency</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Priority focus</Label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {(['dm_growth', 'dmca', 'reputation', 'chat_support'] as CreditPlanPriority[]).map((p) => (
                <label key={p} className="flex items-center gap-2">
                  <Checkbox
                    checked={priorities.has(p)}
                    onCheckedChange={() =>
                      setPriorities((prev) => {
                        const next = new Set(prev)
                        if (next.has(p)) next.delete(p)
                        else next.add(p)
                        return next
                      })
                    }
                  />
                  <span>{p.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label>Messages</Label>
            <Input type="number" value={targetMessages} onChange={(e) => setTargetMessages(Number(e.target.value || 0))} />
          </div>
          <div className="space-y-1">
            <Label>Leak scans</Label>
            <Input type="number" value={targetLeakScans} onChange={(e) => setTargetLeakScans(Number(e.target.value || 0))} />
          </div>
          <div className="space-y-1">
            <Label>Reputation scans</Label>
            <Input
              type="number"
              value={targetReputationScans}
              onChange={(e) => setTargetReputationScans(Number(e.target.value || 0))}
            />
          </div>
          <div className="space-y-1">
            <Label>Chat turns</Label>
            <Input type="number" value={targetChatTurns} onChange={(e) => setTargetChatTurns(Number(e.target.value || 0))} />
          </div>
        </div>
        <Button
          onClick={runCreditPlanner}
          disabled={plannerLoading}
          className="bg-gradient-to-r from-amber-500 to-purple-600 text-white hover:from-amber-400 hover:to-purple-500"
        >
          {plannerLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Build monthly plan
        </Button>
        {plannerResult && (
          <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
            <p className="font-medium">
              Projected depletion: {plannerResult.estimatedDaysToDepletion} days · Planned spend:{' '}
              {plannerResult.projectedMonthlySpend} credits
            </p>
            {plannerResult.allocations.map((row) => (
              <p key={row.category}>
                {row.category.replace('_', ' ')}: {row.credits} credits ({row.percent}%) ~ {row.estimatedActions} actions
              </p>
            ))}
            {plannerResult.safeModeSuggestion ? (
              <p className="text-amber-600 dark:text-amber-400">{plannerResult.safeModeSuggestion}</p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
