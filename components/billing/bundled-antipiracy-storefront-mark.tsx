'use client'

import { cn } from '@/lib/utils'
import type { BundledAntipiracyStorefrontSlide } from '@/lib/billing/clip-focus-addon-carousel'

export type BundledAntipiracyLogoFrame = 'billingStrip' | 'pricingAside'

function RasterBrandImg({
  src,
  width,
  height,
  className,
}: {
  src: string
  width: number
  height: number
  className: string
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local `/public` raster marks; avoids Next/Image edge cases on some URLs
    <img src={src} alt="" width={width} height={height} className={className} loading="lazy" decoding="async" />
  )
}

export function BundledAntipiracyStorefrontLogoMark({
  slide,
  frame,
}: {
  slide: BundledAntipiracyStorefrontSlide
  frame: BundledAntipiracyLogoFrame
}) {
  const glow = slide.glowStyle

  if (!slide.logoSrc) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-gradient-to-br from-[#b71c1c] to-[#ef5350] font-semibold tracking-tight text-white shadow-inner',
          frame === 'pricingAside'
            ? 'mx-auto h-[3rem] w-[3rem] max-h-[85%] max-w-[85%] text-[10px]'
            : 'h-10 w-10 shrink-0 text-[11px]',
        )}
        style={{ filter: glow }}
        aria-hidden
      >
        MV
      </div>
    )
  }

  const isSvg = slide.logoSrc.endsWith('.svg')

  if (frame === 'pricingAside') {
    const inner = isSvg ? (
      // eslint-disable-next-line @next/next/no-img-element -- SVG brand mark
      <img
        src={slide.logoSrc}
        alt=""
        width={slide.width}
        height={slide.height}
        className="h-full max-h-[3.25rem] w-auto max-w-full object-contain p-0.5"
        loading="lazy"
        decoding="async"
      />
    ) : (
      <RasterBrandImg
        src={slide.logoSrc}
        width={slide.width}
        height={slide.height}
        className="h-full max-h-[3.25rem] w-auto max-w-full object-contain p-0.5"
      />
    )
    return (
      <span className="flex h-full w-full items-center justify-center" style={{ filter: glow }} aria-hidden>
        {inner}
      </span>
    )
  }

  const stripInner = isSvg ? (
    // eslint-disable-next-line @next/next/no-img-element -- SVG brand mark
    <img
      src={slide.logoSrc}
      alt=""
      width={slide.width}
      height={slide.height}
      className="h-10 w-auto max-w-full object-contain object-left"
      loading="lazy"
      decoding="async"
    />
  ) : (
    <RasterBrandImg
      src={slide.logoSrc}
      width={slide.width}
      height={slide.height}
      className="h-10 w-auto max-w-full object-contain object-left"
    />
  )

  return (
    <span className="flex items-center justify-start" style={{ filter: glow }} aria-hidden>
      {stripInner}
    </span>
  )
}
