'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { updateAiUnitCostAction, type UpdateUnitCostState } from '@/lib/admin/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" variant="secondary" className="shrink-0" disabled={pending}>
      {pending ? 'Saving…' : 'Save'}
    </Button>
  )
}

type Row = {
  model_key: string
  display_name: string | null
  usd_per_1m_input: number | string
  usd_per_1m_output: number | string
}

export function UnitCostRowForm({ row }: { row: Row }) {
  const [state, action] = useFormState(updateAiUnitCostAction, null as UpdateUnitCostState | null)

  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="model_key" value={row.model_key} />
      <div className="min-w-0 flex-1 space-y-1">
        <Label className="text-xs text-muted-foreground">Display name</Label>
        <Input
          name="display_name"
          defaultValue={row.display_name ?? ''}
          className="h-9"
          placeholder="Label"
        />
      </div>
      <div className="w-full space-y-1 sm:w-28">
        <Label className="text-xs text-muted-foreground">$/1M in</Label>
        <Input
          name="usd_per_1m_input"
          type="number"
          step="any"
          min={0}
          required
          defaultValue={String(row.usd_per_1m_input)}
          className="h-9 tabular-nums"
        />
      </div>
      <div className="w-full space-y-1 sm:w-28">
        <Label className="text-xs text-muted-foreground">$/1M out</Label>
        <Input
          name="usd_per_1m_output"
          type="number"
          step="any"
          min={0}
          required
          defaultValue={String(row.usd_per_1m_output)}
          className="h-9 tabular-nums"
        />
      </div>
      <SaveButton />
      {state?.error ? <p className="w-full text-xs text-destructive sm:order-last sm:w-full">{state.error}</p> : null}
      {state?.ok ? <p className="w-full text-xs text-muted-foreground sm:order-last">Saved.</p> : null}
    </form>
  )
}
