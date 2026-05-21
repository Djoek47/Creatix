'use client'

type MediaMessageProps = {
  src: string
  kind: 'image' | 'video'
  poster?: string
}

export function MediaMessage({ src, kind, poster }: MediaMessageProps) {
  if (kind === 'video') {
    return (
      <video
        src={src}
        poster={poster}
        controls
        playsInline
        className="max-w-full rounded-xl object-contain w-full max-h-[62vh] bg-black/30"
      />
    )
  }

  return (
    <img
      src={src}
      alt="Media"
      className="max-w-full rounded-xl object-contain h-auto max-h-[62vh]"
      loading="lazy"
      decoding="async"
    />
  )
}
