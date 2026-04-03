'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type AudienceProfileValue = 'auto' | 'whale' | 'creator' | 'fan'

type FanProfileTypeSelectProps = {
  value: AudienceProfileValue
  onChange: (next: AudienceProfileValue) => void
  disabled?: boolean
  className?: string
  size?: 'sm' | 'default'
}

export function FanProfileTypeSelect({
  value,
  onChange,
  disabled,
  className,
  size = 'sm',
}: FanProfileTypeSelectProps) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(v) => onChange(v as AudienceProfileValue)}
    >
      <SelectTrigger
        className={cn(
          size === 'sm' && 'h-8 text-[11px]',
          className,
        )}
        aria-label="Profile type"
      >
        <SelectValue placeholder="Profile type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="auto">Auto (CRM + insights)</SelectItem>
        <SelectItem value="whale">Whale / VIP</SelectItem>
        <SelectItem value="creator">Creator signal</SelectItem>
        <SelectItem value="fan">Typical fan</SelectItem>
      </SelectContent>
    </Select>
  )
}
