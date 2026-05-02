'use client'

import { useTranslations } from 'next-intl'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { ScanIdentityHandleRow } from '@/hooks/use-scan-identity'
import { formatScanIdentityHandleLabel } from '@/lib/scan-identity-i18n'

type Props = {
  handles: ScanIdentityHandleRow[]
  useAll: boolean
  onUseAllChange: (v: boolean) => void
  selected: Set<string>
  onToggle: (value: string) => void
  idPrefix?: string
  /** Extra classes for the “All identities” checkbox (e.g. highlight glow). */
  allCheckboxClassName?: string
  className?: string
}

export function ScanHandlePicker({
  handles,
  useAll,
  onUseAllChange,
  selected,
  onToggle,
  idPrefix = 'scan-handle',
  allCheckboxClassName,
  className,
}: Props) {
  const t = useTranslations('dashboard')
  if (handles.length === 0) return null

  return (
    <div
      className={cn(
        'space-y-3 rounded-md border border-border bg-muted/20 p-3 text-xs',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Checkbox
          id={`${idPrefix}-all`}
          checked={useAll}
          onCheckedChange={(c) => onUseAllChange(c === true)}
          className={cn(allCheckboxClassName)}
        />
        <Label htmlFor={`${idPrefix}-all`} className="cursor-pointer text-[13px] font-medium leading-snug">
          {t('scanIdentity.allIdentities')}
        </Label>
      </div>
      {!useAll && (
        <div className="max-h-48 space-y-2 overflow-y-auto pl-1">
          {handles.map((h) => (
            <div key={`${h.source}-${h.value}`} className="flex items-center gap-2">
              <Checkbox
                id={`${idPrefix}-${h.value}`}
                checked={selected.has(h.value)}
                onCheckedChange={() => onToggle(h.value)}
              />
              <Label
                htmlFor={`${idPrefix}-${h.value}`}
                className="cursor-pointer text-[13px] font-normal leading-snug"
              >
                {formatScanIdentityHandleLabel(h, t)}
              </Label>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
