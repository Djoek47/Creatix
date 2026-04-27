import { cn } from '@/lib/utils'

/** Official X (Twitter) mark — matches branding elsewhere in the app. */
export function XLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('h-4 w-4 shrink-0', className)}
      fill="currentColor"
      aria-hidden
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

const SUPPORT_EMAIL = 'admin@circeetvenus.com'
const X_URL = 'https://x.com/circeetvenus'

/**
 * Support email + X profile with logo. Use in marketing and legal footers.
 */
export function FooterSupportSocial({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm',
        className,
      )}
    >
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        {SUPPORT_EMAIL}
      </a>
      <a
        href={X_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Circe et Venus on X"
      >
        <XLogo />
        <span>@circeetvenus</span>
      </a>
    </div>
  )
}
