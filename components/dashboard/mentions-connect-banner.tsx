import Link from 'next/link'

/** Single-line shortcuts — no card chrome */
export function MentionsConnectBanner() {
  return (
    <p className="text-xs text-muted-foreground">
      <Link
        href="/dashboard/settings?tab=integrations"
        className="font-medium text-venus underline-offset-4 hover:underline"
      >
        Integrations
      </Link>
      <span className="mx-1.5 text-border" aria-hidden>
        ·
      </span>
      <Link
        href="/dashboard/protection/aegis"
        className="font-medium text-foreground/90 underline-offset-4 hover:underline"
      >
        Leak scans (Aegis)
      </Link>
    </p>
  )
}
