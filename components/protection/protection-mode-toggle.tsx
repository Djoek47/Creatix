'use client'

import { EasyProModeToggle, type EasyProUiMode } from '@/components/ui/easy-pro-mode-toggle'

type Props = {
  value: EasyProUiMode
  onChange: (mode: EasyProUiMode) => void
  className?: string
}

export function ProtectionModeToggle({ value, onChange, className }: Props) {
  return (
    <EasyProModeToggle
      value={value}
      onChange={onChange}
      className={className}
      ariaLabel="Protection layout mode"
    />
  )
}
