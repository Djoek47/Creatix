import Link from 'next/link'

/** Short cross-link: Aegis vs on-demand web scan on Mentions */
export function MentionsConnectBanner() {
  return (
    <p className="max-w-prose text-[12px] leading-relaxed text-muted-foreground/85">
      <Link
        href="/dashboard/protection/aegis"
        className="font-medium text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
      >
        Aegis
      </Link>{' '}
      performs comparable leak monitoring automatically, on a daily schedule—without running a manual web scan each
      time.
    </p>
  )
}
