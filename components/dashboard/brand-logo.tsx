'use client'

import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Theme-aware logo: light mode uses logo-light.png (white/light background),
 * dark mode uses logo.png (black background). Add logo-light.png to public/ for day mode.
 * If logo-light.png is missing, falls back to logo.png so the app never breaks.
 */
interface BrandLogoProps {
  width?: number
  height?: number
  className?: string
  alt?: string
  priority?: boolean
}

const DEFAULT_SIZE = 32

export function BrandLogo({
  width = DEFAULT_SIZE,
  height = DEFAULT_SIZE,
  className,
  alt = 'Circe and Venus',
  priority = false,
}: BrandLogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [lightFailed, setLightFailed] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted ? resolvedTheme === 'dark' : true
  const useLight = mounted && resolvedTheme !== 'dark' && !lightFailed
  const src = useLight ? '/logo-light.png' : '/logo.png'

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn('rounded-lg object-contain', className)}
      priority={priority}
      onError={() => {
        if (useLight) setLightFailed(true)
      }}
    />
  )
}
