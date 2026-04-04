"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import {
  recalculateAiTelemetryAction,
  type RecalculateTelemetryState,
} from "@/lib/admin/actions"

const initial: RecalculateTelemetryState = {}

export function AdminRecalculateTelemetryButton() {
  const [state, formAction, pending] = useActionState(
    recalculateAiTelemetryAction,
    initial,
  )

  return (
    <form action={formAction} className="inline">
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Recalculating…" : "Recalculate AI usage ($)"}
      </Button>
      {state?.error ? (
        <p className="mt-1 text-xs text-destructive">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Scanned {state.scanned ?? 0} events, updated {state.updated ?? 0}
          {state.moreRemaining
            ? " (more rows remain — run again to continue)"
            : "."}
        </p>
      ) : null}
    </form>
  )
}
