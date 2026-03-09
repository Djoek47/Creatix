import Link from 'next/link'
import { BrandTitle } from '@/components/dashboard/brand-title'

const links = [
  { href: '/about', label: 'About' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/cookies', label: 'Cookie Policy' },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/50 py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between md:items-center">
          <Link href="/" className="shrink-0">
            <BrandTitle className="text-lg" variant="header" />
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-6">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            ))}
            <a
              href="mailto:support@circeandvenus.com"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </a>
          </nav>
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Circe and Venus. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
