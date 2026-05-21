'use client'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type MessageInputProps = {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
  className?: string
}

export function MessageInput({ value, onChange, onSend, disabled, className }: MessageInputProps) {
  return (
    <div className={cn('sticky bottom-0 border-t border-border bg-card p-3', className)}>
      <div className="flex items-end gap-2">
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-[80px] resize-y"
          placeholder="Type your message…"
          disabled={disabled}
        />
        <Button type="button" onClick={onSend} disabled={disabled || !value.trim()}>
          Send
        </Button>
      </div>
    </div>
  )
}
