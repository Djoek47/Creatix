'use client'

import { useEffect, useState } from 'react'

/** Matches Tailwind `sm` / `xl` grid columns used by the fans gallery (1 / 2 / 3). */
export function useFansGalleryColumns(): 1 | 2 | 3 {
  const [columns, setColumns] = useState<1 | 2 | 3>(3)

  useEffect(() => {
    const mqXl = window.matchMedia('(min-width: 1280px)')
    const mqSm = window.matchMedia('(min-width: 640px)')

    function read() {
      if (mqXl.matches) setColumns(3)
      else if (mqSm.matches) setColumns(2)
      else setColumns(1)
    }

    read()
    mqXl.addEventListener('change', read)
    mqSm.addEventListener('change', read)
    return () => {
      mqXl.removeEventListener('change', read)
      mqSm.removeEventListener('change', read)
    }
  }, [])

  return columns
}
