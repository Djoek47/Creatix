'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { ScanIdentityHandleRow } from '@/hooks/use-scan-identity'
import { cn } from '@/lib/utils'
import { UserPlus } from 'lucide-react'

type Props = {
  handles: ScanIdentityHandleRow[]
  useAll: boolean
  onUseAllChange: (v: boolean) => void
  selected: Set<string>
  onToggle: (value: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  extraInput: string
  onExtraInputChange: (v: string) => void
}

export function ProtectionEasyHandles({
  handles,
  useAll,
  onUseAllChange,
  selected,
  onToggle,
  onSelectAll,
  onClearSelection,
  extraInput,
  onExtraInputChange,
}: Props) {
  const [draft, setDraft] = useState('')

  const applyDraft = () => {
    const t = draft.trim()
    if (!t) return
    const next = extraInput.trim() ? `${extraInput.trim()}, ${t}` : t
    onExtraInputChange(next)
    setDraft('')
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card/80 p-4 shadow-sm" data-tour="protection-identity">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">Who should we search for?</p>
          <p className="text-xs text-muted-foreground">
            Connected accounts are listed automatically. Turn off &ldquo;all names&rdquo; to pick individually.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2">
          <Switch
            id="protection-easy-use-all"
            checked={useAll}
            onCheckedChange={(c) => onUseAllChange(c === true)}
          />
          <Label htmlFor="protection-easy-use-all" className="cursor-pointer text-sm font-medium">
            Use all names
          </Label>
        </div>
      </div>

      {handles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-center text-sm text-muted-foreground">
          No connected handles yet. Add extra names below, or connect accounts in Integrations.
        </p>
      ) : useAll ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-3 text-sm text-foreground">
          <span className="font-medium">{handles.length}</span> identity source
          {handles.length === 1 ? '' : 's'} included (every connected name and any extras you add).
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {handles.map((h) => {
              const on = selected.has(h.value)
              return (
                <button
                  key={`${h.source}-${h.value}`}
                  type="button"
                  onClick={() => onToggle(h.value)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    on
                      ? 'border-circe/60 bg-circe/15 text-foreground shadow-sm'
                      : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                  )}
                >
                  {h.label}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onSelectAll}>
              Select all
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={onClearSelection}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2 border-t border-border/60 pt-4">
        <Label htmlFor="protection-extra-draft" className="text-xs text-muted-foreground">
          Add more usernames (stage names, alt @handles)
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            id="protection-extra-draft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                applyDraft()
              }
            }}
            placeholder="e.g. @artistname, oldhandle"
            className="text-sm"
          />
          <Button type="button" variant="secondary" className="shrink-0 gap-1.5" onClick={applyDraft}>
            <UserPlus className="h-4 w-4" />
            Add to search
          </Button>
        </div>
        {extraInput.trim() ? (
          <p className="text-[11px] text-muted-foreground">
            Also searching:{' '}
            <span className="font-medium text-foreground">{extraInput.replace(/\s+/g, ' ').slice(0, 120)}</span>
            {extraInput.length > 120 ? '…' : ''}
          </p>
        ) : null}
      </div>
    </div>
  )
}
