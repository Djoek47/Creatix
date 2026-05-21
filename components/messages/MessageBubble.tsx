'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type MessageBubbleProps = {
  fromCreator: boolean
  children: ReactNode
  className?: string
}

export function MessageBubble({ fromCreator, children, className }: MessageBubbleProps) {
  return (
    <div className={cn('flex', fromCreator ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[96%] md:max-w-[90%] rounded-2xl px-4 py-2', className)}>
        {children}
      </div>
    </div>
  )
}
