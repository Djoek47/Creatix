'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'circe-venus-cookie-consent'

export function CookieConsentBanner() {
  const [mounted, setMounted] = useState(false)
  const [accepted, setAccepted] = useState(true)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      setAccepted(stored === 'true')
    } catch {
      setAccepted(false)
    }
  }, [])

  function handleAccept() {
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
      setAccepted(true)
    } catch {
      setAccepted(true)
    }
  }

  if (!mounted || accepted) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-border bg-card/95 backdrop-blur-sm px-4 py-4 shadow-lg"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="container mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between max-w-4xl">
        <p className="text-sm text-muted-foreground">
          We use cookies to provide and improve the service. By continuing you agree to our{' '}
          <Link href="/cookies" className="text-primary hover:underline">
            Cookie Policy
          </Link>.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href="/cookies">Learn more</Link>
          </Button>
          <Button size="sm" className="brand-button" onClick={handleAccept}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  )
}
