'use client'

import {
  EasyProModeToggle,
  type EasyProUiMode,
  type ConnectedMonetizationPlatform,
} from '@/components/ui/easy-pro-mode-toggle'

type Props = {
  value: EasyProUiMode
  onChange: (mode: EasyProUiMode) => void
  className?: string
  connectedPlatforms?: readonly ConnectedMonetizationPlatform[]
}

export function ProtectionModeToggle({ value, onChange, className, connectedPlatforms }: Props) {
  return (
    <EasyProModeToggle
      value={value}
      onChange={onChange}
      className={className}
      ariaLabel="Protection layout mode"
      connectedPlatforms={connectedPlatforms}
    />
  )
}
