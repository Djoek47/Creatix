import * as React from 'react'

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Default true so mobile menu and Sheet work on first paint in portrait (avoid hydration gap)
  const [isMobile, setIsMobile] = React.useState<boolean>(true)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
